'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'
import SelectDropdown from '@/components/shared/SelectDropdown'
import {
    FiSave, FiFileText, FiCheckSquare, FiHash, FiLayers,
    FiAlertCircle, FiRefreshCw,
} from 'react-icons/fi'

// ══════════════════════════════════════════════════════════
// VALIDATORS
// ══════════════════════════════════════════════════════════

const validateTask           = (v) => (!v ? 'Please select a task' : '')
const validateEvaluationPoint = (v) => (!v ? 'Please select an evaluation point' : '')

const validateScore = (v) => {
    if (v === '' || v === null || v === undefined) return 'Evaluation score is required'
    const n = Number(v)
    if (Number.isNaN(n)) return 'Score must be a number'
    if (n < 0) return 'Score cannot be negative'
    if (n > 100) return 'Score cannot exceed 100'
    return ''
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

// Resolve `value` (id) to the matching option object — same helper used
// in EditTask. Handles async timing safely.
const useResolvedSelection = (options, value) =>
    useMemo(() => {
        if (value === null || value === undefined || value === '') return null
        return options.find((o) => String(o.value) === String(value)) || null
    }, [options, value])

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

const AddEvaluationMatrix = () => {
    const API = process.env.NEXT_PUBLIC_API_URL

    // Form state
    const [taskId,      setTaskId]      = useState(null)
    const [pointId,     setPointId]     = useState(null)
    const [score,       setScore]       = useState('')

    // Touched / errors
    const [touched, setTouched] = useState({ taskId: false, pointId: false, score: false })
    const [errors,  setErrors]  = useState({ taskId: '', pointId: '', score: '' })

    // Submitting
    const [submitting, setSubmitting] = useState(false)

    // Dropdown data
    const [taskOptions,  setTaskOptions]  = useState([])
    const [pointOptions, setPointOptions] = useState([])
    const [loadingTasks,  setLoadingTasks]  = useState(true)
    const [loadingPoints, setLoadingPoints] = useState(true)
    const [fetchError,    setFetchError]    = useState('')

    const scoreRef = useRef(null)

    // ── Fetch dropdown data ────────────────────────────────
    const fetchDropdownData = async () => {
        try {
            setLoadingTasks(true)
            setLoadingPoints(true)
            setFetchError('')

            const [taskRes, pointRes] = await Promise.all([
                axios.get(`${API}/api/get-tasks-for-evalution-matrix`,             { withCredentials: true }),
                axios.get(`${API}/api/get-evalution-points-for-evalution-matrix`, { withCredentials: true }),
            ])

            const tasks = Array.isArray(taskRes.data?.data) ? taskRes.data.data : []
            setTaskOptions(
                tasks.map((t) => ({ value: t._id, label: t.taskTitle || 'Untitled task' }))
            )

            const points = Array.isArray(pointRes.data?.data) ? pointRes.data.data : []
            setPointOptions(
                points.map((p) => ({ value: p._id, label: p.EvaluationPoint || 'Unnamed point' }))
            )
        } catch (err) {
            console.error('Failed to load dropdown data:', err)
            const msg = err?.response?.data?.message || 'Failed to load tasks or evaluation points.'
            setFetchError(msg)
            topTost?.('error', msg)
        } finally {
            setLoadingTasks(false)
            setLoadingPoints(false)
        }
    }

    useEffect(() => {
        fetchDropdownData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Resolved selections (for SelectDropdown) ───────────
    const taskSelected  = useResolvedSelection(taskOptions,  taskId)
    const pointSelected = useResolvedSelection(pointOptions, pointId)

    // ── Handlers ───────────────────────────────────────────
    const handleTaskSelect = (option) => {
        const val = option?.value ?? null
        setTaskId(val)
        setTouched((prev) => ({ ...prev, taskId: true }))
        setErrors((prev) => ({ ...prev, taskId: validateTask(val) }))
    }

    const handlePointSelect = (option) => {
        const val = option?.value ?? null
        setPointId(val)
        setTouched((prev) => ({ ...prev, pointId: true }))
        setErrors((prev) => ({ ...prev, pointId: validateEvaluationPoint(val) }))
    }

    const handleScoreChange = (value) => {
        setScore(value)
        if (touched.score) setErrors((prev) => ({ ...prev, score: validateScore(value) }))
    }

    const handleScoreBlur = () => {
        setTouched((prev) => ({ ...prev, score: true }))
        setErrors((prev) => ({ ...prev, score: validateScore(score) }))
    }

    // ── Submit ─────────────────────────────────────────────
    const handleSubmit = async () => {
        const taskErr  = validateTask(taskId)
        const pointErr = validateEvaluationPoint(pointId)
        const scoreErr = validateScore(score)

        setTouched({ taskId: true, pointId: true, score: true })
        setErrors({ taskId: taskErr, pointId: pointErr, score: scoreErr })

        if (taskErr || pointErr || scoreErr) {
            if (scoreErr && !taskErr && !pointErr) scoreRef.current?.focus()
            return
        }

        try {
            setSubmitting(true)
            await axios.post(
                `${API}/api/add-evaluation-matrix`,
                {
                    TaskID: taskId,
                    EvaluationPointID: pointId,
                    EvaluationScore: Number(score),
                },
                { withCredentials: true }
            )
            topTost?.('success', 'Evaluation matrix added successfully!')

            // Reset form
            setTaskId(null)
            setPointId(null)
            setScore('')
            setTouched({ taskId: false, pointId: false, score: false })
            setErrors({ taskId: '', pointId: '', score: '' })
        } catch (err) {
            console.error('Failed to add evaluation matrix:', err)
            const msg = err?.response?.data?.message || 'Failed to add evaluation matrix. Please try again.'
            topTost?.('error', typeof msg === 'string' ? msg : 'Failed to add evaluation matrix.')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Error state ────────────────────────────────────────
    if (fetchError && taskOptions.length === 0 && pointOptions.length === 0) {
        return (
            <div className="col-xl-8 col-12">
                <div className="card stretch stretch-full">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <div className="mb-3 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 64, height: 64, background: '#fee2e2', color: '#dc2626' }}>
                            <FiAlertCircle size={28} />
                        </div>
                        <p className="text-danger mb-3">{fetchError}</p>
                        <button className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
                            onClick={fetchDropdownData}>
                            <FiRefreshCw size={14} /> Retry
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="col-xl-8 col-12">
            <div className="card stretch stretch-full">

                <div className="card-header">
                    <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                        <FiLayers className="text-primary" />
                        Add Evaluation Matrix
                    </h5>
                    <p className="text-muted fs-12 mb-0 mt-1">
                        Assign an evaluation score to a task for a specific evaluation point
                    </p>
                </div>

                <div className="card-body">

                    {/* Task dropdown */}
                    <div className="mb-4">
                        <label className="form-label fw-semibold">
                            Task <span className="text-danger">*</span>
                        </label>
                        {loadingTasks ? (
                            <div className="d-flex align-items-center py-2">
                                <RotatingLines visible height="22" width="22" color="blue" strokeWidth="5" animationDuration="0.75" />
                                <span className="text-muted fs-13 ms-2">Loading tasks...</span>
                            </div>
                        ) : taskOptions.length === 0 ? (
                            <div className="d-flex align-items-center gap-2 p-3 rounded-3 fs-12 text-warning"
                                style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                                <FiAlertCircle size={14} />
                                <span>No tasks available. Create a task first.</span>
                            </div>
                        ) : (
                            <>
                                <SelectDropdown
                                    options={taskOptions}
                                    selectedOption={taskSelected}
                                    defaultSelect="Select a task"
                                    onSelectOption={handleTaskSelect}
                                    disabled={submitting}
                                />
                                {touched.taskId && errors.taskId && (
                                    <div className="invalid-feedback d-block">{errors.taskId}</div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Evaluation Point dropdown */}
                    <div className="mb-4">
                        <label className="form-label fw-semibold">
                            Evaluation Point <span className="text-danger">*</span>
                        </label>
                        {loadingPoints ? (
                            <div className="d-flex align-items-center py-2">
                                <RotatingLines visible height="22" width="22" color="blue" strokeWidth="5" animationDuration="0.75" />
                                <span className="text-muted fs-13 ms-2">Loading evaluation points...</span>
                            </div>
                        ) : pointOptions.length === 0 ? (
                            <div className="d-flex align-items-center gap-2 p-3 rounded-3 fs-12 text-warning"
                                style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                                <FiAlertCircle size={14} />
                                <span>No evaluation points available. Create one first.</span>
                            </div>
                        ) : (
                            <>
                                <SelectDropdown
                                    options={pointOptions}
                                    selectedOption={pointSelected}
                                    defaultSelect="Select an evaluation point"
                                    onSelectOption={handlePointSelect}
                                    disabled={submitting}
                                />
                                {touched.pointId && errors.pointId && (
                                    <div className="invalid-feedback d-block">{errors.pointId}</div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Evaluation Score */}
                    <div className="mb-4">
                        <label className="form-label fw-semibold">
                            Evaluation Score <span className="text-danger">*</span>
                            <span className="text-muted fs-11 ms-1">(0 – 100)</span>
                        </label>
                        <div className="position-relative">
                            <FiHash size={14} className="text-muted position-absolute"
                                style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                            <input
                                ref={scoreRef}
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                className={`form-control ps-5 ${touched.score ? (errors.score ? 'is-invalid' : '') : ''}`}
                                placeholder="e.g., 85"
                                value={score}
                                onChange={(e) => handleScoreChange(e.target.value)}
                                onBlur={handleScoreBlur}
                                disabled={submitting}
                            />
                        </div>
                        {touched.score && errors.score && (
                            <div className="invalid-feedback d-block">{errors.score}</div>
                        )}
                    </div>

                </div>

                <div className="card-footer d-flex align-items-center justify-content-between bg-transparent">
                    <span className="fs-11 text-muted">
                        <span className="text-danger">*</span> indicates required fields
                    </span>
                    <button className="btn btn-primary d-flex align-items-center"
                        onClick={handleSubmit}
                        disabled={submitting || loadingTasks || loadingPoints || taskOptions.length === 0 || pointOptions.length === 0}>
                        {submitting ? (
                            <RotatingLines visible height="20" width="20" color="white" strokeWidth="5" animationDuration="0.75" />
                        ) : (
                            <>
                                <FiSave size={16} className="me-2" />
                                <span>Add</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    )
}

export default AddEvaluationMatrix