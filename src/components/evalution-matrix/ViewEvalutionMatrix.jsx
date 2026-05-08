'use client'
import React, { useState, useEffect, useMemo } from 'react'
import topTost from '@/utils/topTost'
import {
    FiLayers, FiSearch, FiAlertCircle, FiRefreshCw, FiInbox,
    FiBriefcase, FiGitBranch, FiCheckSquare, FiAward, FiFileText,
} from 'react-icons/fi'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'

// ── Helpers ─────────────────────────────────────────────────
const sumScores = (matrix = []) =>
    matrix.reduce((acc, m) => acc + (Number(m.EvaluationScore) || 0), 0)

// Pick a color band for a score badge — purely visual, helps the user
// scan results at a glance without reading every number.
const scoreColor = (score) => {
    const n = Number(score) || 0
    if (n >= 80) return { bg: '#dcfce7', text: '#15803d' } // green
    if (n >= 50) return { bg: '#dbeafe', text: '#1d4ed8' } // blue
    if (n >= 25) return { bg: '#fef3c7', text: '#b45309' } // amber
    return { bg: '#fee2e2', text: '#b91c1c' }              // red
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

const ViewEvaluationMatrix = () => {
    const API = process.env.NEXT_PUBLIC_API_URL

    const [matrices,   setMatrices]   = useState([])
    const [loading,    setLoading]    = useState(true)
    const [fetchError, setFetchError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    // ── Fetch ───────────────────────────────────────────────
    const fetchMatrices = async () => {
        try {
            setLoading(true)
            setFetchError('')
            const res = await axios.get(
                `${API}/api/get-evalution-matrix`,
                { withCredentials: true }
            )
            setMatrices(Array.isArray(res.data?.data) ? res.data.data : [])
        } catch (err) {
            console.error('Failed to load evaluation matrix:', err)
            const msg = err?.response?.data?.message || 'Failed to load evaluation matrix.'
            setFetchError(msg)
            topTost?.('error', msg)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMatrices()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Client-side search ──────────────────────────────────
    const filteredMatrices = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        if (!q) return matrices
        return matrices.filter((m) => {
            const title  = (m.taskTitle   || '').toLowerCase()
            const org    = (m.orgScope    || '').toLowerCase()
            const branch = (m.branchScope || '').toLowerCase()
            const points = (m.evaluationMatrix || [])
                .map((e) => (e.EvaluationPoint || '').toLowerCase())
                .join(' ')
            return title.includes(q) || org.includes(q) || branch.includes(q) || points.includes(q)
        })
    }, [matrices, searchTerm])

    // ── Render: loading / error / data ──────────────────────
    if (loading) {
        return (
            <div className="col-xl-12">
                <div className="card stretch stretch-full">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <RotatingLines visible height="40" width="40" color="blue" strokeWidth="5" animationDuration="0.75" />
                        <p className="text-muted mt-3 mb-0">Loading evaluation matrix...</p>
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
                            onClick={fetchMatrices}>
                            <FiRefreshCw size={14} /> Retry
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="col-xl-12">
            <div className="card stretch stretch-full">

                {/* Header */}
                <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                        <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                            <FiLayers className="text-primary" />
                            Evaluation Matrix
                        </h5>
                        <p className="text-muted fs-12 mb-0 mt-1">
                            {matrices.length} {matrices.length === 1 ? 'task' : 'tasks'} configured
                        </p>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <div className="position-relative">
                            <FiSearch size={14} className="text-muted position-absolute"
                                style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                            <input type="text"
                                className="form-control ps-5"
                                style={{ minWidth: 240 }}
                                placeholder="Search task, org, branch, or point..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                            onClick={fetchMatrices} title="Refresh">
                            <FiRefreshCw size={14} />
                            <span className="d-none d-md-inline">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="card-body">
                    {filteredMatrices.length === 0 ? (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div className="mb-3 rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: 64, height: 64, background: '#eef2ff', color: '#4f46e5' }}>
                                <FiInbox size={28} />
                            </div>
                            <p className="text-muted mb-0">
                                {searchTerm
                                    ? `No tasks match "${searchTerm}"`
                                    : 'No evaluation matrix configured yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {filteredMatrices.map((task, idx) => {
                                const total      = sumScores(task.evaluationMatrix)
                                const pointCount = (task.evaluationMatrix || []).length

                                return (
                                    <div key={task._id || idx}
                                        className="rounded-3 border"
                                        style={{ background: '#fff', overflow: 'hidden' }}>

                                        {/* Task header */}
                                        <div className="p-3 d-flex flex-wrap align-items-start justify-content-between gap-3"
                                            style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            <div className="d-flex align-items-start gap-3 flex-grow-1 min-width-0">
                                                <div className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                                    style={{ width: 40, height: 40, background: '#eef2ff' }}>
                                                    <FiFileText size={18} className="text-primary" />
                                                </div>
                                                <div className="min-width-0">
                                                    <h6 className="fw-bold mb-1 fs-14 text-dark text-truncate">
                                                        {task.taskTitle || 'Untitled task'}
                                                    </h6>
                                                    <div className="d-flex flex-wrap align-items-center gap-3">
                                                        {task.orgScope && (
                                                            <span className="d-inline-flex align-items-center gap-1 fs-12 text-muted">
                                                                <FiBriefcase size={12} />
                                                                {task.orgScope}
                                                            </span>
                                                        )}
                                                        {task.branchScope && (
                                                            <span className="d-inline-flex align-items-center gap-1 fs-12 text-muted">
                                                                <FiGitBranch size={12} />
                                                                {task.branchScope}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Total badge */}
                                            <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                                <div className="text-end">
                                                    <div className="fs-11 text-muted">Total Score</div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <FiAward size={14} className="text-primary" />
                                                        <span className="fw-bold fs-14 text-primary">{total}</span>
                                                        <span className="fs-11 text-muted">
                                                            ({pointCount} {pointCount === 1 ? 'point' : 'points'})
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Evaluation points */}
                                        {pointCount === 0 ? (
                                            <div className="p-3 fs-13 text-muted fst-italic">
                                                No evaluation points configured for this task.
                                            </div>
                                        ) : (
                                            <div className="table-responsive">
                                                <table className="table table-hover mb-0 align-middle">
                                                    <thead style={{ background: '#fafafa' }}>
                                                        <tr>
                                                            <th className="fs-11 fw-semibold text-muted ps-3" style={{ width: 50 }}>#</th>
                                                            <th className="fs-11 fw-semibold text-muted">Evaluation Point</th>
                                                            <th className="fs-11 fw-semibold text-muted text-end pe-3" style={{ width: 140 }}>Score</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {task.evaluationMatrix.map((entry, i) => {
                                                            const c = scoreColor(entry.EvaluationScore)
                                                            return (
                                                                <tr key={i}>
                                                                    <td className="ps-3 text-muted fs-13">{i + 1}</td>
                                                                    <td>
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <FiCheckSquare size={13} className="text-primary" />
                                                                            <span className="fs-13 text-dark">
                                                                                {entry.EvaluationPoint || '—'}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-end pe-3">
                                                                        <span className="badge fw-bold fs-12 px-2 py-1"
                                                                            style={{ background: c.bg, color: c.text }}>
                                                                            {entry.EvaluationScore ?? 0}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {filteredMatrices.length > 0 && (
                    <div className="card-footer bg-transparent">
                        <span className="fs-12 text-muted">
                            Showing {filteredMatrices.length} of {matrices.length}
                        </span>
                    </div>
                )}

            </div>
        </div>
    )
}

export default ViewEvaluationMatrix