'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import topTost from '@/utils/topTost'
import {
    FiCheckSquare, FiSearch, FiUser, FiCalendar, FiAlertCircle,
    FiRefreshCw, FiEdit2, FiInbox, FiTrash2, FiSave,
} from 'react-icons/fi'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'

// ── Helpers ─────────────────────────────────────────────────
const formatDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
    })
}

const validateEvaluationPoint = (value) => {
    const trimmed = (value || '').trim()
    if (!trimmed) return 'Evaluation point is required'
    if (trimmed.length < 3) return 'Evaluation point must be at least 3 characters'
    if (trimmed.length > 100) return 'Evaluation point must be under 100 characters'
    if (!/^[a-zA-Z\s&.,'-]+$/.test(trimmed)) return 'Only letters are allowed (no numbers)'
    return ''
}

// ══════════════════════════════════════════════════════════
// EDIT MODAL
// ══════════════════════════════════════════════════════════
const EditModal = ({ point, onClose, onSaved, API }) => {
    const [value, setValue]       = useState(point?.EvaluationPoint || '')
    const [error, setError]       = useState('')
    const [touched, setTouched]   = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const inputRef = useRef(null)

    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 50)
        return () => clearTimeout(t)
    }, [])

    const handleChange = (v) => {
        setValue(v)
        if (touched) setError(validateEvaluationPoint(v))
    }

    const handleBlur = () => {
        setTouched(true)
        setError(validateEvaluationPoint(value))
    }

    const handleSave = async () => {
        setTouched(true)
        const err = validateEvaluationPoint(value)
        setError(err)
        if (err) {
            inputRef.current?.focus()
            return
        }

        // No change — close silently
        if (value.trim() === (point?.EvaluationPoint || '').trim()) {
            onClose()
            return
        }

        try {
            setSubmitting(true)
            await axios.post(
                `${API}/api/edit-evalution-point/${point._id}`,
                { EvaluationPoint: value.trim() },
                { withCredentials: true }
            )
            topTost?.('success', 'Evaluation point updated successfully!')
            onSaved({ ...point, EvaluationPoint: value.trim() })
        } catch (err) {
            console.error('Failed to update evaluation point:', err)
            const msg = err?.response?.data?.message || 'Failed to update evaluation point.'
            topTost?.('error', msg)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title d-flex align-items-center gap-2">
                            <FiEdit2 className="text-primary" />
                            Edit Evaluation Point
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose} disabled={submitting} />
                    </div>
                    <div className="modal-body">
                        <label className="form-label fw-semibold">
                            Evaluation Point <span className="text-danger">*</span>
                        </label>
                        <div className="position-relative">
                            <FiCheckSquare size={14} className="text-muted position-absolute"
                                style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                            <input
                                ref={inputRef}
                                type="text"
                                className={`form-control ps-5 ${touched && error ? 'is-invalid' : ''}`}
                                placeholder="Enter evaluation point"
                                value={value}
                                onChange={(e) => handleChange(e.target.value)}
                                onBlur={handleBlur}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                                disabled={submitting}
                                maxLength={100} />
                        </div>
                        {touched && error && <div className="invalid-feedback d-block">{error}</div>}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary"
                            onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-primary d-flex align-items-center"
                            onClick={handleSave} disabled={submitting}>
                            {submitting ? (
                                <RotatingLines visible height="20" width="20" color="white" strokeWidth="5" animationDuration="0.75" />
                            ) : (
                                <>
                                    <FiSave size={14} className="me-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════
// DELETE CONFIRM MODAL
// ══════════════════════════════════════════════════════════
const DeleteModal = ({ point, onClose, onDeleted, API }) => {
    const [submitting, setSubmitting] = useState(false)

    const handleDelete = async () => {
        try {
            setSubmitting(true)
            await axios.delete(
                `${API}/api/delete-evalution-point/${point._id}`,
                { withCredentials: true }
            )
            topTost?.('success', 'Evaluation point deleted successfully!')
            onDeleted(point._id)
        } catch (err) {
            console.error('Failed to delete evaluation point:', err)
            const msg = err?.response?.data?.message || 'Failed to delete evaluation point.'
            topTost?.('error', msg)
            setSubmitting(false)
        }
    }

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title d-flex align-items-center gap-2">
                            <FiAlertCircle className="text-danger" />
                            Delete Evaluation Point
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose} disabled={submitting} />
                    </div>
                    <div className="modal-body">
                        <div className="d-flex align-items-start gap-3 p-3 rounded-3"
                            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                            <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                                style={{ width: 40, height: 40, background: '#fee2e2' }}>
                                <FiTrash2 size={18} className="text-danger" />
                            </div>
                            <div>
                                <p className="mb-2 fw-medium">Are you sure you want to delete this evaluation point?</p>
                                <div className="p-2 rounded bg-white border fs-13">
                                    <strong>{point?.EvaluationPoint}</strong>
                                </div>
                                <p className="text-muted fs-12 mb-0 mt-2">
                                    This action cannot be undone. Tasks already using this evaluation point may be affected.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary"
                            onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-danger d-flex align-items-center"
                            onClick={handleDelete} disabled={submitting}>
                            {submitting ? (
                                <RotatingLines visible height="20" width="20" color="white" strokeWidth="5" animationDuration="0.75" />
                            ) : (
                                <>
                                    <FiTrash2 size={14} className="me-2" />
                                    Delete
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
const ViewEvaluationPoints = () => {
    const API = process.env.NEXT_PUBLIC_API_URL

    const [points,     setPoints]     = useState([])
    const [loading,    setLoading]    = useState(true)
    const [fetchError, setFetchError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    const [editTarget,   setEditTarget]   = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)

    // ── Fetch ───────────────────────────────────────────────
    const fetchPoints = async () => {
        try {
            setLoading(true)
            setFetchError('')
            const res = await axios.get(
                `${API}/api/get-evalution-points`,
                { withCredentials: true }
            )
            setPoints(Array.isArray(res.data?.data) ? res.data.data : [])
        } catch (err) {
            console.error('Failed to load evaluation points:', err)
            const msg = err?.response?.data?.message || 'Failed to load evaluation points.'
            setFetchError(msg)
            topTost?.('error', msg)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPoints()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Local mutations after edit / delete ────────────────
    const handleEdited = (updated) => {
        setPoints((prev) => prev.map((p) =>
            p._id === updated._id ? { ...p, ...updated, updatedAt: new Date().toISOString() } : p
        ))
        setEditTarget(null)
    }

    const handleDeleted = (deletedId) => {
        setPoints((prev) => prev.filter((p) => p._id !== deletedId))
        setDeleteTarget(null)
    }

    // ── Client-side search ──────────────────────────────────
    const filteredPoints = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        if (!q) return points
        return points.filter((p) => {
            const ep = (p.EvaluationPoint || '').toLowerCase()
            const addedBy = (p.AddedBy?.name || '').toLowerCase()
            return ep.includes(q) || addedBy.includes(q)
        })
    }, [points, searchTerm])

    // ── Render: loading / error / data ──────────────────────
    if (loading) {
        return (
            <div className="col-xl-12">
                <div className="card stretch stretch-full">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <RotatingLines visible height="40" width="40" color="blue" strokeWidth="5" animationDuration="0.75" />
                        <p className="text-muted mt-3 mb-0">Loading evaluation points...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (fetchError) {
        return (
            <div className="col-xl-12">
                <div className="card stretch stretch-full">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <div className="mb-3 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 64, height: 64, background: '#fee2e2', color: '#dc2626' }}>
                            <FiAlertCircle size={28} />
                        </div>
                        <p className="text-danger mb-3">{fetchError}</p>
                        <button className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
                            onClick={fetchPoints}>
                            <FiRefreshCw size={14} /> Retry
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="col-xl-12">
                <div className="card stretch stretch-full">

                    {/* Header */}
                    <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div>
                            <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                                <FiCheckSquare className="text-primary" />
                                Evaluation Points
                            </h5>
                            <p className="text-muted fs-12 mb-0 mt-1">
                                {points.length} {points.length === 1 ? 'point' : 'points'} added so far
                            </p>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <div className="position-relative">
                                <FiSearch size={14} className="text-muted position-absolute"
                                    style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                                <input type="text"
                                    className="form-control ps-5"
                                    style={{ minWidth: 240 }}
                                    placeholder="Search points..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                                onClick={fetchPoints} title="Refresh">
                                <FiRefreshCw size={14} />
                                <span className="d-none d-md-inline">Refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="card-body p-0">
                        {filteredPoints.length === 0 ? (
                            <div className="d-flex flex-column align-items-center justify-content-center py-5">
                                <div className="mb-3 rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: 64, height: 64, background: '#eef2ff', color: '#4f46e5' }}>
                                    <FiInbox size={28} />
                                </div>
                                <p className="text-muted mb-0">
                                    {searchTerm
                                        ? `No evaluation points match "${searchTerm}"`
                                        : 'No evaluation points added yet'}
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0 align-middle">
                                    <thead style={{ background: '#f9fafb' }}>
                                        <tr>
                                            <th className="fs-12 fw-semibold text-muted ps-4" style={{ width: 60 }}>#</th>
                                            <th className="fs-12 fw-semibold text-muted">Evaluation Point</th>
                                            <th className="fs-12 fw-semibold text-muted">Added By</th>
                                            <th className="fs-12 fw-semibold text-muted">Updated By</th>
                                            <th className="fs-12 fw-semibold text-muted">Created</th>
                                            <th className="fs-12 fw-semibold text-muted">Updated</th>
                                            <th className="fs-12 fw-semibold text-muted text-end pe-4" style={{ width: 140 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPoints.map((p, idx) => (
                                            <tr key={p._id || idx}>
                                                <td className="ps-4 text-muted fs-13">{idx + 1}</td>

                                                <td>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                                            style={{ width: 32, height: 32, background: '#eef2ff' }}>
                                                            <FiCheckSquare size={14} className="text-primary" />
                                                        </span>
                                                        <span className="fs-13 fw-medium text-dark">
                                                            {p.EvaluationPoint || '—'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td>
                                                    {p.AddedBy ? (
                                                        <div className="d-flex align-items-center gap-2">
                                                            <FiUser size={13} className="text-muted" />
                                                            <div>
                                                                <div className="fs-13 fw-medium text-dark">
                                                                    {p.AddedBy.name || 'Unknown'}
                                                                </div>
                                                                {p.AddedBy.email && (
                                                                    <div className="fs-11 text-muted">{p.AddedBy.email}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted fs-13">—</span>
                                                    )}
                                                </td>

                                                <td>
                                                    {p.UpdatedBy ? (
                                                        <div className="d-flex align-items-center gap-2">
                                                            <FiEdit2 size={13} className="text-muted" />
                                                            <div>
                                                                <div className="fs-13 fw-medium text-dark">
                                                                    {p.UpdatedBy.name || 'Unknown'}
                                                                </div>
                                                                {p.UpdatedBy.email && (
                                                                    <div className="fs-11 text-muted">{p.UpdatedBy.email}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted fs-13">—</span>
                                                    )}
                                                </td>

                                                <td>
                                                    <div className="d-flex align-items-center gap-1 text-muted fs-12">
                                                        <FiCalendar size={12} />
                                                        {formatDate(p.createdAt)}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="d-flex align-items-center gap-1 text-muted fs-12">
                                                        <FiCalendar size={12} />
                                                        {formatDate(p.updatedAt)}
                                                    </div>
                                                </td>

                                                <td className="pe-4">
                                                    <div className="d-flex align-items-center justify-content-end gap-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center justify-content-center"
                                                            style={{ width: 32, height: 32, padding: 0 }}
                                                            onClick={() => setEditTarget(p)}
                                                            title="Edit">
                                                            <FiEdit2 size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center"
                                                            style={{ width: 32, height: 32, padding: 0 }}
                                                            onClick={() => setDeleteTarget(p)}
                                                            title="Delete">
                                                            <FiTrash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {filteredPoints.length > 0 && (
                        <div className="card-footer bg-transparent">
                            <span className="fs-12 text-muted">
                                Showing {filteredPoints.length} of {points.length}
                            </span>
                        </div>
                    )}

                </div>
            </div>

            {/* Modals */}
            {editTarget && (
                <EditModal
                    point={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={handleEdited}
                    API={API}
                />
            )}
            {deleteTarget && (
                <DeleteModal
                    point={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={handleDeleted}
                    API={API}
                />
            )}
        </>
    )
}

export default ViewEvaluationPoints