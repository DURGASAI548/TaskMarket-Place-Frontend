'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
    FiMoreVertical, FiEdit, FiTrash2, FiSearch, FiX, FiPlus,
    FiAlertCircle, FiRefreshCw, FiCalendar, FiAward, FiUsers,
    FiBriefcase, FiHash, FiClock, FiChevronLeft, FiChevronRight,
    FiCheckCircle, FiXCircle, FiActivity, FiTag, FiEye,
} from 'react-icons/fi'
import CardHeader from '@/components/shared/CardHeader'
import CardLoader from '@/components/shared/CardLoader'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'

const PAGE_SIZE = 9   // 3x3 grid on desktop

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    })
}

const formatDateTime = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    })
}

// Compute derived status: upcoming / registration-open / submission-open / evaluation / completed
const getTaskStatus = (task) => {
    const now = new Date()
    const liveFrom  = task.taskRegistrationLiveFrom ? new Date(task.taskRegistrationLiveFrom) : null
    const regEnd    = task.taskRegistrationDeadline ? new Date(task.taskRegistrationDeadline) : null
    const subEnd    = task.taskSubmissionDeadline   ? new Date(task.taskSubmissionDeadline)   : null
    const resultEnd = task.taskResultDeadline       ? new Date(task.taskResultDeadline)       : null

    if (liveFrom && now < liveFrom)               return { key: 'upcoming',     label: 'Upcoming',          color: 'secondary' }
    if (regEnd && now < regEnd)                   return { key: 'registration', label: 'Registration Open', color: 'success'   }
    if (subEnd && now < subEnd)                   return { key: 'submission',   label: 'Submissions Open',  color: 'primary'   }
    if (resultEnd && now < resultEnd)             return { key: 'evaluation',   label: 'Evaluating',        color: 'warning'   }
    return { key: 'completed', label: 'Completed', color: 'dark' }
}

// Soft hash → color for the avatar circle
const COLOR_PALETTE = ['#6366f1', '#06b6d4', '#16a34a', '#ea580c', '#dc2626', '#7c3aed', '#0891b2', '#be185d']
const colorForString = (str) => {
    let h = 0
    const s = String(str || '?')
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    return COLOR_PALETTE[Math.abs(h) % COLOR_PALETTE.length]
}

// ══════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════

const TaskPagination = ({ currentPage, totalPages, totalItems, from, to, onPageChange }) => {
    if (totalPages <= 1) return null

    const buildPages = () => {
        const pages = []
        const range = []
        for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) range.push(i)
        if (range[0] > 2) pages.push(1, '...')
        else if (range[0] === 2) pages.push(1)
        range.forEach((p) => pages.push(p))
        if (range[range.length - 1] < totalPages - 1) pages.push('...', totalPages)
        else if (range[range.length - 1] === totalPages - 1) pages.push(totalPages)
        return pages
    }

    const pages = buildPages()
    const isFirst = currentPage === 1
    const isLast  = currentPage === totalPages

    return (
        <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 w-100">
            <span className="fs-12 text-muted">
                Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{totalItems}</strong> tasks
            </span>
            <ul className="pagination pagination-sm mb-0 flex-wrap justify-content-center">
                <li className={`page-item ${isFirst ? 'disabled' : ''}`}>
                    <button className="page-link d-flex align-items-center gap-1" onClick={() => onPageChange(currentPage - 1)} disabled={isFirst}>
                        <FiChevronLeft size={13} /><span className="d-none d-sm-inline">Prev</span>
                    </button>
                </li>
                {pages.map((p, idx) =>
                    p === '...' ? (
                        <li key={`e-${idx}`} className="page-item disabled"><span className="page-link px-2">…</span></li>
                    ) : (
                        <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => onPageChange(p)}>{p}</button>
                        </li>
                    )
                )}
                <li className={`page-item ${isLast ? 'disabled' : ''}`}>
                    <button className="page-link d-flex align-items-center gap-1" onClick={() => onPageChange(currentPage + 1)} disabled={isLast}>
                        <span className="d-none d-sm-inline">Next</span><FiChevronRight size={13} />
                    </button>
                </li>
            </ul>
        </div>
    )
}

// ══════════════════════════════════════════════════════════
// SKELETON CARD
// ══════════════════════════════════════════════════════════

const SkeletonCard = () => (
    <div className="col-xl-4 col-lg-6 col-md-6 col-12 mb-3">
        <div className="card border h-100">
            <div className="card-body">
                <div className="d-flex align-items-start gap-3 mb-3">
                    <div className="placeholder-glow">
                        <span className="placeholder bg-secondary rounded-2" style={{ width: 48, height: 48, display: 'block' }} />
                    </div>
                    <div className="flex-grow-1 placeholder-glow">
                        <span className="placeholder bg-secondary rounded mb-2" style={{ width: '70%', height: 14, display: 'block' }} />
                        <span className="placeholder bg-secondary rounded" style={{ width: '50%', height: 11, display: 'block' }} />
                    </div>
                </div>
                <div className="placeholder-glow mb-2">
                    <span className="placeholder bg-secondary rounded" style={{ width: '100%', height: 10, display: 'block' }} />
                </div>
                <div className="placeholder-glow mb-3">
                    <span className="placeholder bg-secondary rounded" style={{ width: '80%', height: 10, display: 'block' }} />
                </div>
                <div className="d-flex gap-2 placeholder-glow">
                    <span className="placeholder bg-secondary rounded" style={{ width: 60, height: 22, display: 'block' }} />
                    <span className="placeholder bg-secondary rounded" style={{ width: 80, height: 22, display: 'block' }} />
                </div>
            </div>
        </div>
    </div>
)

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

const ViewTasks = ({ title = 'Tasks' }) => {
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete: handleCardDelete } = useCardTitleActions()

    const [tasks,      setTasks]      = useState(null)
    const [loading,    setLoading]    = useState(true)
    const [fetchError, setFetchError] = useState('')

    const [deletingId, setDeletingId] = useState(null)
    const [activeDropdown, setActiveDropdown] = useState(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')   // all/upcoming/registration/submission/evaluation/completed
    const [liveFilter,   setLiveFilter]   = useState('all')   // all/live/draft

    const [currentPage, setCurrentPage] = useState(1)
    const dropdownRef = useRef(null)

    // ── Fetch ─────────────────────────────────────────────
    const fetchTasks = async () => {
        try {
            setLoading(true)
            setFetchError('')
            const result = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/get-tasks`,
                { withCredentials: true }
            )
            setTasks(result.data.data || [])
        } catch (err) {
            console.error('Failed to fetch tasks:', err)
            setFetchError(err?.response?.data?.message || 'Failed to load tasks. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTasks() }, [])
    useEffect(() => { if (refreshKey) fetchTasks() }, [refreshKey])
    useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter, liveFilter])

    // Outside-click closes action dropdown
    useEffect(() => {
        if (!activeDropdown) return
        const close = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setActiveDropdown(null)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [activeDropdown])

    // ── Filtered list ─────────────────────────────────────
    const filteredTasks = useMemo(() => {
        if (!tasks) return null
        let list = tasks

        // Search across title, taskNo, org, branch
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase()
            list = list.filter((t) =>
                String(t.taskTitle || '').toLowerCase().includes(q) ||
                String(t.taskNo || '').toLowerCase().includes(q) ||
                String(t.orgScopeName || t.organizationName || '').toLowerCase().includes(q) ||
                String(t.branchScopeName || t.branchName || '').toLowerCase().includes(q)
            )
        }

        // Status filter (derived)
        if (statusFilter !== 'all') {
            list = list.filter((t) => getTaskStatus(t).key === statusFilter)
        }

        // Live filter
        if (liveFilter === 'live')  list = list.filter((t) => t.isLive === true)
        if (liveFilter === 'draft') list = list.filter((t) => !t.isLive)

        return list
    }, [tasks, searchQuery, statusFilter, liveFilter])

    // ── Pagination math ───────────────────────────────────
    const totalItems = filteredTasks?.length ?? 0
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
    const safePage   = Math.min(currentPage, totalPages)
    const from       = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
    const to         = Math.min(safePage * PAGE_SIZE, totalItems)
    const pageSlice  = filteredTasks?.slice(from - 1, to) ?? []

    // ── Stat counts (for the filter pills) ────────────────
    const counts = useMemo(() => {
        if (!tasks) return null
        const c = { all: tasks.length, upcoming: 0, registration: 0, submission: 0, evaluation: 0, completed: 0, live: 0, draft: 0 }
        tasks.forEach((t) => {
            const s = getTaskStatus(t).key
            c[s] = (c[s] || 0) + 1
            if (t.isLive) c.live++; else c.draft++
        })
        return c
    }, [tasks])

    // ── Delete ────────────────────────────────────────────
    const handleDeleteTask = async (id) => {
        if (deletingId) return
        try {
            setDeletingId(id)
            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/delete-task/${id}`,
                { withCredentials: true }
            )
            setTasks((prev) => prev.filter((t) => t._id !== id))
            topTost?.('success', 'Task deleted successfully!')
        } catch (err) {
            console.error('Failed to delete task:', err)
            topTost?.('error', err?.response?.data?.message || 'Failed to delete task.')
        } finally {
            setDeletingId(null)
            setActiveDropdown(null)
        }
    }

    const isAnyDeleting = deletingId !== null

    if (isRemoved) return null

    return (
        <div className="col-xxl-12">
            <div className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${refreshKey ? 'card-loading' : ''}`}>
                {/* <CardHeader title={title} refresh={handleRefresh} remove={handleCardDelete} expanded={handleExpand} /> */}

                {/* ── Search & Filter ─────────────────────── */}
                {!loading && !fetchError && tasks && tasks.length > 0 && (
                    <div className="card-header py-3 border-top">
                        <div className="row align-items-center g-2 w-100">
                            <div className="col-lg-4 col-md-6 col-12">
                                <div className="position-relative">
                                    <FiSearch size={14} className="text-muted position-absolute"
                                        style={{ left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        className="form-control form-control-sm ps-5 pe-5"
                                        placeholder="Search by title, task no, org, branch..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button className="btn btn-sm position-absolute border-0 p-0"
                                            style={{ right: 10, top: '50%', transform: 'translateY(-50%)' }}
                                            onClick={() => setSearchQuery('')}>
                                            <FiX size={14} className="text-muted" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Status pills */}
                            <div className="col-lg-6 col-md-12 d-flex gap-1 flex-wrap">
                                {[
                                    { key: 'all',          label: 'All' },
                                    { key: 'upcoming',     label: 'Upcoming' },
                                    { key: 'registration', label: 'Reg Open' },
                                    { key: 'submission',   label: 'Submission' },
                                    { key: 'evaluation',   label: 'Evaluating' },
                                    { key: 'completed',    label: 'Completed' },
                                ].map((f) => (
                                    <button key={f.key}
                                        className={`btn btn-xs ${statusFilter === f.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                        onClick={() => setStatusFilter(f.key)}>
                                        {f.label}
                                        {counts && counts[f.key] !== undefined && (
                                            <span className="ms-1 opacity-75">({counts[f.key] || 0})</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Add task */}
                            <div className="col-lg-2 col-md-6 col-12 text-end">
                                <Link href="/add-task" className="btn btn-sm btn-primary">
                                    <FiPlus size={14} className="me-1" />Add Task
                                </Link>
                            </div>
                        </div>

                        
                    </div>
                )}

                {/* ── Body ────────────────────────────────── */}
                <div className="card-body">

                    {/* Loading skeleton */}
                    {loading && (
                        <div className="row">
                            {[1,2,3,4,5,6].map((i) => <SkeletonCard key={i} />)}
                        </div>
                    )}

                    {/* Error */}
                    {!loading && fetchError && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10 mb-3" style={{ width: 56, height: 56 }}>
                                <FiAlertCircle size={24} className="text-danger" />
                            </div>
                            <h6 className="fw-bold mb-1 fs-13">Failed to load tasks</h6>
                            <p className="text-muted fs-12 mb-3 text-center" style={{ maxWidth: 320 }}>{fetchError}</p>
                            <button className="btn btn-sm btn-primary d-flex align-items-center" onClick={fetchTasks}>
                                <FiRefreshCw size={13} className="me-1" /> Try Again
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !fetchError && (!tasks || tasks.length === 0) && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 mb-3" style={{ width: 56, height: 56 }}>
                                <FiAward size={24} className="text-primary" />
                            </div>
                            <h6 className="fw-bold mb-1 fs-13">No tasks yet</h6>
                            <p className="text-muted fs-12 mb-3">Get started by creating your first task.</p>
                            <Link href="/add-task" className="btn btn-sm btn-primary d-flex align-items-center">
                                <FiPlus size={13} className="me-1" /> Add Task
                            </Link>
                        </div>
                    )}

                    {/* No results */}
                    {!loading && !fetchError && tasks && tasks.length > 0 && pageSlice.length === 0 && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <FiSearch size={28} className="text-muted mb-3" />
                            <h6 className="fw-bold mb-1 fs-13">No tasks match your filters</h6>
                            <p className="text-muted fs-12 mb-3 text-center" style={{ maxWidth: 340 }}>
                                Try clearing filters or changing your search query.
                            </p>
                            <button className="btn btn-sm btn-outline-primary"
                                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setLiveFilter('all') }}>
                                Clear all filters
                            </button>
                        </div>
                    )}

                    {/* Task cards */}
                    {!loading && !fetchError && pageSlice.length > 0 && (
                        <div className="row">
                            {pageSlice.map((task) => {
                                const isThisDeleting = deletingId === task._id
                                const status = getTaskStatus(task)
                                const avatarColor = colorForString(task.taskTitle)

                                // Registration progress (registered / eligible)
                                const registered = task.registeredCount ?? task.studentsRegistered ?? 0
                                const eligible   = task.eligibleCount   ?? task.totalEligibleStudents ?? 0
                                const progressPct = eligible > 0
                                    ? Math.min(100, Math.round((registered / eligible) * 100))
                                    : 0

                                return (
                                    <div key={task._id} className="col-xl-4 col-lg-6 col-md-6 col-12 mb-3"
                                        style={{
                                            opacity: isAnyDeleting && !isThisDeleting ? 0.5 : 1,
                                            transition: 'opacity 0.2s ease',
                                        }}>
                                        <div className="card border h-100 position-relative" style={{ overflow: 'visible' }}>
                                            <div className="card-body">

                                                {/* Header row: avatar + title + actions */}
                                                <div className="d-flex align-items-start gap-3 mb-3">
                                                    <div
                                                        className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0 fw-bold text-white"
                                                        style={{ width: 48, height: 48, background: avatarColor, fontSize: 18 }}>
                                                        {(task.taskTitle || '?').substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <div className="flex-grow-1 min-width-0">
                                                        <div className="d-flex align-items-center gap-1 mb-1">
                                                            <FiHash size={11} className="text-muted" />
                                                            <span className="fs-11 fw-medium text-muted">{task.taskNo || '—'}</span>
                                                            {task.isLive ? (
                                                                <span className="badge bg-soft-success text-success ms-auto fs-10">
                                                                    <FiActivity size={9} className="me-1" />Live
                                                                </span>
                                                            ) : (
                                                                <span className="badge bg-soft-secondary text-secondary ms-auto fs-10">Draft</span>
                                                            )}
                                                        </div>
                                                        <h6 className="fw-bold mb-0 fs-13 text-truncate" title={task.taskTitle}>
                                                            {task.taskTitle || 'Untitled task'}
                                                        </h6>
                                                    </div>

                                                    {/* Actions menu */}
                                                    {isThisDeleting ? (
                                                        <div className="flex-shrink-0">
                                                            <RotatingLines visible height="22" width="22" color="grey" strokeWidth="5" animationDuration="0.75" />
                                                        </div>
                                                    ) : (
                                                        <div className="position-relative flex-shrink-0"
                                                            ref={activeDropdown === task._id ? dropdownRef : null}>
                                                            <button className="btn btn-sm btn-icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setActiveDropdown((p) => p === task._id ? null : task._id)
                                                                }}
                                                                disabled={isAnyDeleting}>
                                                                <FiMoreVertical size={16} />
                                                            </button>
                                                            {activeDropdown === task._id && (
                                                                <div className="position-absolute bg-white border rounded-2 shadow-sm py-1"
                                                                    style={{ right: 0, top: '100%', zIndex: 10, minWidth: 150 }}
                                                                    onClick={(e) => e.stopPropagation()}>
                                                                    <Link href={`/view-task/${task._id}`}
                                                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 fs-12">
                                                                        <FiEye size={13} /> View Details
                                                                    </Link>
                                                                    <Link href={`/edit-task/${task._id}`}
                                                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 fs-12">
                                                                        <FiEdit size={13} /> Edit Task
                                                                    </Link>
                                                                    <button
                                                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 fs-12 text-danger"
                                                                        onClick={() => handleDeleteTask(task._id)}>
                                                                        <FiTrash2 size={13} /> Delete Task
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Status badge + reward type */}
                                                <div className="d-flex flex-wrap gap-2 mb-3">
                                                    <span className={`badge bg-soft-${status.color} text-${status.color} fs-11`}>
                                                        {status.label}
                                                    </span>
                                                    {task.taskRewardType && (
                                                        <span className="badge bg-soft-primary text-primary fs-11">
                                                            <FiAward size={10} className="me-1" />
                                                            {task.taskRewardType === 'cash' ? 'Cash' : 'Certificate'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Scope row */}
                                                <div className="d-flex align-items-center gap-2 mb-2 fs-12 text-muted">
                                                    <FiBriefcase size={12} className="flex-shrink-0" />
                                                    <span className="text-truncate">
                                                        {task.orgScopeName || task.organizationName || 'Organization scope'}
                                                        {(task.branchScopeName || task.branchName) && (
                                                            <span className="text-dark"> · {task.branchScopeName || task.branchName}</span>
                                                        )}
                                                    </span>
                                                </div>

                                                {/* Tags */}
                                                {Array.isArray(task.taskTags) && task.taskTags.length > 0 && (
                                                    <div className="d-flex flex-wrap gap-1 mb-3">
                                                        {task.taskTags.slice(0, 3).map((tag, i) => {
                                                            const tagLabel = typeof tag === 'object' ? (tag.tagName || tag.name || tag.label) : tag
                                                            const tagColor = typeof tag === 'object' ? tag.color : null
                                                            return (
                                                                <span key={i} className="badge fs-10"
                                                                    style={{
                                                                        background: tagColor ? `${tagColor}20` : '#eef2ff',
                                                                        color: tagColor || '#4f46e5',
                                                                        fontWeight: 500,
                                                                    }}>
                                                                    <FiTag size={9} className="me-1" />{tagLabel}
                                                                </span>
                                                            )
                                                        })}
                                                        {task.taskTags.length > 3 && (
                                                            <span className="badge bg-soft-secondary text-secondary fs-10">
                                                                +{task.taskTags.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Registration progress */}
                                                {eligible > 0 && (
                                                    <div className="mb-3">
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <span className="fs-11 text-muted d-flex align-items-center gap-1">
                                                                <FiUsers size={11} />Registrations
                                                            </span>
                                                            <span className="fs-11 fw-semibold">
                                                                {registered} <span className="text-muted">/ {eligible}</span>
                                                            </span>
                                                        </div>
                                                        <div className="progress" style={{ height: 5 }}>
                                                            <div
                                                                className={`progress-bar bg-${progressPct > 70 ? 'success' : progressPct > 30 ? 'primary' : 'warning'}`}
                                                                role="progressbar"
                                                                style={{ width: `${progressPct}%` }}
                                                                aria-valuenow={progressPct}
                                                                aria-valuemin={0}
                                                                aria-valuemax={100}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Date timeline */}
                                                <div className="border-top pt-3" style={{ fontSize: '0.75rem' }}>
                                                    <div className="row g-2">
                                                        <div className="col-6">
                                                            <div className="d-flex align-items-center gap-1 text-muted mb-1">
                                                                <FiClock size={10} />
                                                                <span style={{ fontSize: '0.65rem' }}>LIVE FROM</span>
                                                            </div>
                                                            <div className="fw-medium">{formatDate(task.taskRegistrationLiveFrom)}</div>
                                                        </div>
                                                        <div className="col-6">
                                                            <div className="d-flex align-items-center gap-1 text-muted mb-1">
                                                                <FiCalendar size={10} />
                                                                <span style={{ fontSize: '0.65rem' }}>REG ENDS</span>
                                                            </div>
                                                            <div className="fw-medium">{formatDate(task.taskRegistrationDeadline)}</div>
                                                        </div>
                                                        <div className="col-6">
                                                            <div className="d-flex align-items-center gap-1 text-muted mb-1">
                                                                <FiCalendar size={10} />
                                                                <span style={{ fontSize: '0.65rem' }}>SUBMIT BY</span>
                                                            </div>
                                                            <div className="fw-medium">{formatDate(task.taskSubmissionDeadline)}</div>
                                                        </div>
                                                        <div className="col-6">
                                                            <div className="d-flex align-items-center gap-1 text-muted mb-1">
                                                                <FiCheckCircle size={10} />
                                                                <span style={{ fontSize: '0.65rem' }}>RESULTS</span>
                                                            </div>
                                                            <div className="fw-medium">{formatDate(task.taskResultDeadline)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination footer */}
                {!loading && !fetchError && tasks && tasks.length > 0 && pageSlice.length > 0 && (
                    <div className="card-footer py-3">
                        <TaskPagination
                            currentPage={safePage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            from={from}
                            to={to}
                            onPageChange={(p) => setCurrentPage(p)}
                        />
                    </div>
                )}

                <CardLoader refreshKey={refreshKey} />
            </div>
        </div>
    )
}

export default ViewTasks