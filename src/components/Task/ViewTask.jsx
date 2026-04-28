'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
    FiMoreVertical, FiEdit, FiTrash2, FiSearch, FiX, FiPlus,
    FiAlertCircle, FiRefreshCw, FiCalendar, FiAward, FiUsers,
    FiBriefcase, FiClock, FiChevronLeft, FiChevronRight,
    FiCheckCircle, FiActivity, FiTag, FiEye, FiZap,
    FiLayers, FiTrendingUp, FiPauseCircle, FiPlayCircle,
} from 'react-icons/fi'
import CardHeader from '@/components/shared/CardHeader'
import CardLoader from '@/components/shared/CardLoader'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'

const PAGE_SIZE = 9

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatFullDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Status with rich theming for each phase
const STATUS_THEMES = {
    upcoming: {
        label: 'Upcoming', icon: FiClock, color: '#64748b', bg: '#f1f5f9',
        accent: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
    },
    registration: {
        label: 'Registration Open', icon: FiPlayCircle, color: '#16a34a', bg: '#dcfce7',
        accent: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
    },
    submission: {
        label: 'Submissions Open', icon: FiZap, color: '#2563eb', bg: '#dbeafe',
        accent: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    },
    evaluation: {
        label: 'Evaluating', icon: FiActivity, color: '#d97706', bg: '#fef3c7',
        accent: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    },
    completed: {
        label: 'Completed', icon: FiCheckCircle, color: '#475569', bg: '#e2e8f0',
        accent: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)',
    },
}

const getTaskStatus = (task) => {
    const now = new Date()
    const liveFrom = task.taskRegistrationLiveFrom ? new Date(task.taskRegistrationLiveFrom) : null
    const regEnd = task.taskRegistrationDeadline ? new Date(task.taskRegistrationDeadline) : null
    const subEnd = task.taskSubmissionDeadline ? new Date(task.taskSubmissionDeadline) : null
    const resultEnd = task.taskResultDeadline ? new Date(task.taskResultDeadline) : null

    if (liveFrom && now < liveFrom) return { key: 'upcoming', ...STATUS_THEMES.upcoming, nextDate: liveFrom, nextLabel: 'Starts in' }
    if (regEnd && now < regEnd) return { key: 'registration', ...STATUS_THEMES.registration, nextDate: regEnd, nextLabel: 'Registration closes in' }
    if (subEnd && now < subEnd) return { key: 'submission', ...STATUS_THEMES.submission, nextDate: subEnd, nextLabel: 'Submission closes in' }
    if (resultEnd && now < resultEnd) return { key: 'evaluation', ...STATUS_THEMES.evaluation, nextDate: resultEnd, nextLabel: 'Results in' }
    return { key: 'completed', ...STATUS_THEMES.completed, nextDate: null, nextLabel: '' }
}

// Time-until helper: "3 days", "5 hours", "Today"
const timeUntil = (date) => {
    if (!date) return ''
    const diff = new Date(date) - new Date()
    if (diff <= 0) return 'Now'
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'}`
    if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
    if (minutes > 0) return `${minutes} min`
    return 'Soon'
}

// Color from string (for avatar gradient)
const BADGE_COLOR_PAIRS = [
    'badge bg-soft-primary text-primary', 'badge bg-soft-warning text-warning', 'badge bg-soft-success text-success', 'badge bg-soft-danger text-danger', 'badge bg-soft-info text-info'
]
const getRandomColorPair = () => {
    const index = Math.floor(Math.random() * BADGE_COLOR_PAIRS.length);
    return BADGE_COLOR_PAIRS[index];
};
const COLOR_PAIRS = [
    ['#6366f1', '#8b5cf6'], ['#06b6d4', '#0ea5e9'], ['#16a34a', '#22c55e'],
    ['#ea580c', '#f97316'], ['#dc2626', '#f43f5e'], ['#7c3aed', '#a855f7'],
    ['#0891b2', '#06b6d4'], ['#be185d', '#ec4899'],
]
const gradientForString = (str) => {
    let h = 0
    const s = String(str || '?')
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    const [c1, c2] = COLOR_PAIRS[Math.abs(h) % COLOR_PAIRS.length]
    return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`
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
    const isLast = currentPage === totalPages

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
// SKELETON
// ══════════════════════════════════════════════════════════

const SkeletonCard = () => (
    <div className="col-xl-4 col-lg-6 col-md-6 col-12 mb-4">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
            <div className="placeholder-glow" style={{ height: 5, background: '#e5e7eb', borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
            <div className="card-body p-4">
                <div className="d-flex align-items-start gap-3 mb-3">
                    <span className="placeholder bg-secondary rounded-3" style={{ width: 52, height: 52, display: 'inline-block' }} />
                    <div className="flex-grow-1">
                        <span className="placeholder bg-secondary rounded mb-2" style={{ width: '60%', height: 14, display: 'block' }} />
                        <span className="placeholder bg-secondary rounded" style={{ width: '40%', height: 11, display: 'block' }} />
                    </div>
                </div>
                <span className="placeholder bg-secondary rounded mb-3" style={{ width: '100%', height: 30, display: 'block' }} />
                <div className="d-flex gap-2 mb-3">
                    <span className="placeholder bg-secondary rounded" style={{ width: 70, height: 22, display: 'inline-block' }} />
                    <span className="placeholder bg-secondary rounded" style={{ width: 90, height: 22, display: 'inline-block' }} />
                </div>
                <span className="placeholder bg-secondary rounded" style={{ width: '100%', height: 6, display: 'block' }} />
            </div>
        </div>
    </div>
)

// ══════════════════════════════════════════════════════════
// SUMMARY STAT (top-of-page)
// ══════════════════════════════════════════════════════════

const StatBlock = ({ icon: Icon, label, value, color, bg, active, onClick }) => (
    <button type="button"
        onClick={onClick}
        className="border-0 text-start position-relative p-3 rounded-3 w-100 h-100"
        style={{
            background: active ? bg : '#fff',
            border: `1px solid ${active ? color : '#e5e7eb'} !important`,
            boxShadow: active ? `0 0 0 3px ${bg}` : 'none',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
        }}>
        <div className="d-flex align-items-center justify-content-between">
            <div>
                <div className="fs-11 text-muted fw-medium mb-1" style={{ letterSpacing: 0.3 }}>{label.toUpperCase()}</div>
                <div className="fw-bold" style={{ fontSize: 22, lineHeight: 1, color: active ? color : '#111' }}>{value}</div>
            </div>
            <div className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                style={{ width: 38, height: 38, background: bg }}>
                <Icon size={18} style={{ color }} />
            </div>
        </div>
    </button>
)

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

const ViewTasks = ({ title = 'Tasks' }) => {
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete: handleCardDelete } = useCardTitleActions()

    const [tasks, setTasks] = useState(null)
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState('')

    const [deletingId, setDeletingId] = useState(null)
    const [activeDropdown, setActiveDropdown] = useState(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [liveFilter, setLiveFilter] = useState('all')
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

    useEffect(() => {
        if (!activeDropdown) return
        const close = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setActiveDropdown(null)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [activeDropdown])

    // ── Counts ────────────────────────────────────────────
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

    // ── Filtered ──────────────────────────────────────────
    const filteredTasks = useMemo(() => {
        if (!tasks) return null
        let list = tasks

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase()
            list = list.filter((t) =>
                String(t.taskTitle || '').toLowerCase().includes(q) ||
                String(t.taskNo || '').toLowerCase().includes(q) ||
                String(t.orgScopeName || t.organizationName || '').toLowerCase().includes(q) ||
                String(t.branchScopeName || t.branchName || '').toLowerCase().includes(q)
            )
        }
        if (statusFilter !== 'all') list = list.filter((t) => getTaskStatus(t).key === statusFilter)
        if (liveFilter === 'live') list = list.filter((t) => t.isLive === true)
        if (liveFilter === 'draft') list = list.filter((t) => !t.isLive)

        return list
    }, [tasks, searchQuery, statusFilter, liveFilter])

    // ── Pagination ────────────────────────────────────────
    const totalItems = filteredTasks?.length ?? 0
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
    const safePage = Math.min(currentPage, totalPages)
    const from = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
    const to = Math.min(safePage * PAGE_SIZE, totalItems)
    const pageSlice = filteredTasks?.slice(from - 1, to) ?? []

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
    const hasActiveFilters = searchQuery.trim() || statusFilter !== 'all' || liveFilter !== 'all'

    if (isRemoved) return null

    return (
        <div className="col-xxl-12">
            <div className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${refreshKey ? 'card-loading' : ''}`}>
                {/* <CardHeader title={title} refresh={handleRefresh} remove={handleCardDelete} expanded={handleExpand} /> */}

                {/* ═══════ STAT TILES (clickable filters) ═══════ */}
                {!loading && !fetchError && tasks && tasks.length > 0 && counts && (
                    <div className="card-header py-4 border-top" style={{ background: '#fafbfc' }}>
                        <div className="row g-2 mb-3 col-12">
                            <div className="col-md-3 col-6">
                                <StatBlock icon={FiLayers} label="Total" value={counts.all}
                                    color="#4f46e5" bg="#eef2ff"
                                    active={statusFilter === 'all'}
                                    onClick={() => setStatusFilter('all')} />
                            </div>
                            <div className="col-md-3 col-6">
                                <StatBlock icon={FiClock} label="Upcoming" value={counts.upcoming}
                                    color={STATUS_THEMES.upcoming.color} bg={STATUS_THEMES.upcoming.bg}
                                    active={statusFilter === 'upcoming'}
                                    onClick={() => setStatusFilter('upcoming')} />
                            </div>
                            <div className="col-md-3 col-6">
                                <StatBlock icon={FiPlayCircle} label="Reg Open" value={counts.registration}
                                    color={STATUS_THEMES.registration.color} bg={STATUS_THEMES.registration.bg}
                                    active={statusFilter === 'registration'}
                                    onClick={() => setStatusFilter('registration')} />
                            </div>

                            <div className="col-md-3 col-6">
                                <StatBlock icon={FiActivity} label="Evaluating" value={counts.evaluation}
                                    color={STATUS_THEMES.evaluation.color} bg={STATUS_THEMES.evaluation.bg}
                                    active={statusFilter === 'evaluation'}
                                    onClick={() => setStatusFilter('evaluation')} />
                            </div>
                            <div className="col-md-3 col-6">
                                <StatBlock icon={FiCheckCircle} label="Completed" value={counts.completed}
                                    color={STATUS_THEMES.completed.color} bg={STATUS_THEMES.completed.bg}
                                    active={statusFilter === 'completed'}
                                    onClick={() => setStatusFilter('completed')} />
                            </div>
                        </div>

                        {/* Search & live filter row */}
                        {/* <div className="row g-2 align-items-center">
                            <div className="col-lg-5 col-md-6 col-12">
                                <div className="position-relative">
                                    <FiSearch size={14} className="text-muted position-absolute"
                                        style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input type="text"
                                        className="form-control ps-5 pe-5"
                                        placeholder="Search tasks by title, number, organization..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ borderRadius: 10, height: 40 }} />
                                    {searchQuery && (
                                        <button className="btn btn-sm position-absolute border-0 p-0"
                                            style={{ right: 12, top: '50%', transform: 'translateY(-50%)' }}
                                            onClick={() => setSearchQuery('')}>
                                            <FiX size={15} className="text-muted" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="col-lg-5 col-md-6 col-12 d-flex gap-2 flex-wrap align-items-center">
                                <span className="fs-12 text-muted fw-medium">Status:</span>
                                {[
                                    { key: 'all',   label: 'All',         icon: null },
                                    { key: 'live',  label: 'Live',        icon: FiPlayCircle },
                                    { key: 'draft', label: 'Draft',       icon: FiPauseCircle },
                                ].map((f) => {
                                    const Icon = f.icon
                                    return (
                                        <button key={f.key}
                                            className={`btn btn-sm d-flex align-items-center gap-1 ${liveFilter === f.key ? 'btn-dark' : 'btn-outline-secondary'}`}
                                            style={{ borderRadius: 8, fontSize: '0.78rem', padding: '4px 12px' }}
                                            onClick={() => setLiveFilter(f.key)}>
                                            {Icon && <Icon size={12} />}
                                            <span>{f.label}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="col-lg-2 col-md-12 col-12 text-lg-end">
                                <Link href="/add-task" className="btn btn-primary d-inline-flex align-items-center gap-1"
                                    style={{ borderRadius: 8 }}>
                                    <FiPlus size={15} />Add Task
                                </Link>
                            </div>
                        </div> */}

                        {/* {hasActiveFilters && (
                            <div className="mt-2">
                                <button className="btn btn-sm btn-link text-decoration-none p-0 fs-12"
                                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); setLiveFilter('all') }}>
                                    ✕ Clear all filters
                                </button>
                            </div>
                        )} */}
                    </div>
                )}

                {/* ═══════ BODY ═══════ */}
                <div className="card-body" style={{ background: '#fafbfc', minHeight: 300 }}>

                    {loading && (
                        <div className="row">{[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}</div>
                    )}

                    {!loading && fetchError && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10 mb-3" style={{ width: 64, height: 64 }}>
                                <FiAlertCircle size={28} className="text-danger" />
                            </div>
                            <h6 className="fw-bold mb-1">Failed to load tasks</h6>
                            <p className="text-muted fs-13 mb-3 text-center" style={{ maxWidth: 340 }}>{fetchError}</p>
                            <button className="btn btn-primary d-flex align-items-center" onClick={fetchTasks}>
                                <FiRefreshCw size={14} className="me-1" /> Try Again
                            </button>
                        </div>
                    )}

                    {!loading && !fetchError && (!tasks || tasks.length === 0) && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                                style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #ddd6fe 0%, #e9d5ff 100%)' }}>
                                <FiAward size={32} style={{ color: '#7c3aed' }} />
                            </div>
                            <h5 className="fw-bold mb-1">No tasks yet</h5>
                            <p className="text-muted fs-13 mb-3">Get started by creating your first task.</p>
                            <Link href="/add-task" className="btn btn-primary d-flex align-items-center">
                                <FiPlus size={14} className="me-1" /> Create Your First Task
                            </Link>
                        </div>
                    )}

                    {!loading && !fetchError && tasks && tasks.length > 0 && pageSlice.length === 0 && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <FiSearch size={32} className="text-muted mb-3" />
                            <h6 className="fw-bold mb-1">No tasks match your filters</h6>
                            <p className="text-muted fs-13 mb-3 text-center" style={{ maxWidth: 340 }}>
                                Try adjusting your search or filters.
                            </p>
                            <button className="btn btn-outline-primary"
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
                                const StatusIcon = status.icon
                                const avatarGradient = gradientForString(task.taskTitle)

                                const registered = task.registeredCount ?? task.studentsRegistered ?? 0
                                const eligible = task.eligibleCount ?? task.totalEligibleStudents ?? 0
                                const progressPct = eligible > 0 ? Math.min(100, Math.round((registered / eligible) * 100)) : 0

                                return (
                                    <div key={task._id} className="col-xl-4 col-lg-6 col-md-6 col-12 mb-4"
                                        style={{
                                            opacity: isAnyDeleting && !isThisDeleting ? 0.4 : 1,
                                            transition: 'opacity 0.2s ease',
                                        }}>
                                        <div className="card border-0 h-100 position-relative"
                                            style={{
                                                borderRadius: 14,
                                                overflow: 'visible',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                                                transition: 'all 0.2s ease',
                                            }}>
                                            <div className="card-body p-4">

                                                {/* ── Header: avatar + title + actions ── */}
                                                <div className="d-flex align-items-start gap-3 mb-3">
                                                    <div
                                                        className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0 fw-bold text-white"
                                                        style={{ width: 52, height: 52, background: avatarGradient, fontSize: 22, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                                                        {(task.taskTitle || '?').substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <div className="flex-grow-1 min-width-0">
                                                        <div className="d-flex align-items-center gap-2 mb-1">
                                                            <span className="fs-11 fw-semibold text-muted" style={{ letterSpacing: 0.5 }}>
                                                                #{task.taskNo || '—'}
                                                            </span>
                                                            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
                                                            {task.isLive ? (
                                                                <span className="d-flex align-items-center gap-1 fs-11 fw-medium" style={{ color: '#16a34a' }}>
                                                                    <span className="rounded-circle d-inline-block" style={{ width: 6, height: 6, background: '#16a34a', boxShadow: '0 0 0 3px rgba(22,163,74,0.2)' }} />
                                                                    Live
                                                                </span>
                                                            ) : (
                                                                <span className="d-flex align-items-center gap-1 fs-11 fw-medium text-muted">
                                                                    <span className="rounded-circle d-inline-block" style={{ width: 6, height: 6, background: '#94a3b8' }} />
                                                                    Draft
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h6 className="fw-bold mb-0 text-truncate" style={{ fontSize: 15 }}
                                                            title={task.taskTitle}>
                                                            {task.taskTitle || 'Untitled task'}
                                                        </h6>
                                                    </div>

                                                    {/* Actions */}
                                                    {isThisDeleting ? (
                                                        <RotatingLines visible height="22" width="22" color="grey" strokeWidth="5" animationDuration="0.75" />
                                                    ) : (
                                                        <div className="position-relative flex-shrink-0"
                                                            ref={activeDropdown === task._id ? dropdownRef : null}>
                                                            <button className="btn btn-sm btn-icon"
                                                                style={{ height: 32, borderRadius: 8 }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setActiveDropdown((p) => p === task._id ? null : task._id)
                                                                }}
                                                                disabled={isAnyDeleting}>
                                                                <FiMoreVertical size={15} />

                                                            </button>
                                                            {activeDropdown === task._id && (
                                                                <div className="position-absolute bg-white shadow border-0 py-1"
                                                                    style={{
                                                                        right: 0, top: '100%', zIndex: 10, minWidth: 160,
                                                                        borderRadius: 10,
                                                                        boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}>

                                                                    <Link href={`/view-task/${task._id}`}
                                                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 fs-12">
                                                                        <FiEye size={13} /> View Details
                                                                    </Link>
                                                                    <Link href={`/edit-task/${task._id}`}
                                                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 fs-12">
                                                                        <FiEdit size={13} /> Edit Task
                                                                    </Link>
                                                                    <div className="dropdown-divider my-1" />
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



                                                {/* ── Meta row: scope + reward ── */}
                                                <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                                                    <div className="d-flex align-items-center gap-2 fs-12">
                                                        <FiBriefcase size={12} className="text-muted flex-shrink-0" />
                                                        <span className="text-truncate fw-medium">
                                                            {console.log(task)}
                                                            {task.orgScopeName || task.organizationName || '—'}
                                                            {(task.branchScopeName || task.branchName) && (
                                                                <span className="text-muted fw-normal"> · {task.branchScopeName || task.branchName}</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {task.taskRewardType && (
                                                        <div className="d-flex align-items-center gap-2 fs-12">
                                                            <FiAward size={12} className="text-muted flex-shrink-0" />
                                                            <span className="fw-medium">
                                                                {task.taskRewardType === 'cash' ? 'Cash Reward' : 'Certificate Reward'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>








                                                {/* ── Tags ── */}
                                                {Array.isArray(task.taskTags) && task.taskTags.length > 0 && (
                                                    <div className="d-flex flex-wrap gap-1 mb-3">
                                                        {task.taskTags.slice(0, 3).map((tag, i) => {
                                                            const tagLabel = typeof tag === 'object' ? (tag.tagName || tag.TagName || tag.name || tag.label) : tag
                                                            const tagColor = typeof tag === 'object' ? tag.color : null
                                                            return (
                                                                <span key={i} className={`d-inline-flex align-items-center gap-2 px-2 py-2 ${getRandomColorPair()}`}
                                                                    style={{
                                                                        // background: tagColor ? `${tagColor}15` : '#eef2ff',
                                                                        // background:getRandomColorPair(),
                                                                        // color: getRandomColorPair(),
                                                                        // fontWeight: 500,
                                                                        // fontSize: 10,
                                                                        borderRadius: 6,
                                                                    }}>
                                                                    <FiTag size={10} />{tagLabel}
                                                                </span>
                                                            )
                                                        })}
                                                        {task.taskTags.length > 3 && (
                                                            <span className="px-2 py-1" style={{
                                                                background: '#f1f5f9', color: '#64748b',
                                                                fontWeight: 500, fontSize: 10, borderRadius: 6,
                                                            }}>
                                                                +{task.taskTags.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="d-flex align-items-center justify-content-between p-2 mb-3"
                                                    style={{
                                                        // background: status.bg,
                                                        borderRadius: 10,
                                                        border: `1px solid ${status.color}20`,
                                                    }}>
                                                    <div className="d-flex flex-column gap-2">
                                                        <div className='d-flex gap-2 align-items-center my-2'>
                                                            <StatusIcon size={14} style={{ color: status.color }} />
                                                            <span className="fs-13 fw-semibold">
                                                                Task Description
                                                            </span>
                                                        </div>
                                                        <div className="fs-12" style={{ textAlign: "justify" }}>
                                                            {task.taskDescription
                                                                ? task.taskDescription.length > 300
                                                                    ? task.taskDescription.slice(0, 300) + "..."
                                                                    : task.taskDescription
                                                                : "NO Description"}
                                                        </div>
                                                    </div>

                                                </div>


                                                {/* ── Status banner with countdown ── */}
                                                <div className="d-flex align-items-center justify-content-between p-2 mb-3"
                                                    style={{
                                                        // background: status.bg,
                                                        borderRadius: 10,
                                                        border: `1px solid ${status.color}20`,
                                                    }}>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <StatusIcon size={14} style={{ color: status.color }} />
                                                        <span className="fs-12 fw-semibold">
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    {status.nextDate && (
                                                        <div className="text-end d-flex align-items-center gap-2">
                                                            <div className="fs-10 text-muted" style={{ letterSpacing: 0.3 }}>
                                                                {status.nextLabel.toUpperCase()}
                                                            </div>
                                                            <div className="fs-12 fw-bold" style={{ color: status.color }}>
                                                                {timeUntil(status.nextDate)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* ── Registration progress ── */}
                                                {eligible > 0 ? (
                                                    <div className="p-3 mb-3" style={{ background: '#f8fafc', borderRadius: 10 }}>
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <span className="fs-11 text-muted d-flex align-items-center gap-1 fw-medium">
                                                                <FiUsers size={11} />Registrations
                                                            </span>
                                                            <span className="fs-12 fw-bold">
                                                                {registered}<span className="text-muted fw-normal"> / {eligible}</span>
                                                                <span className="ms-2 fs-11 text-muted">({progressPct}%)</span>
                                                            </span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                                                            <div style={{
                                                                height: '100%',
                                                                width: `${progressPct}%`,
                                                                background: progressPct > 70 ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                                                    : progressPct > 30 ? 'linear-gradient(90deg, #2563eb, #3b82f6)'
                                                                        : 'linear-gradient(90deg, #d97706, #f59e0b)',
                                                                borderRadius: 99,
                                                                transition: 'width 0.3s ease',
                                                            }} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-2 mb-3 fs-11 text-muted text-center" style={{ background: '#f8fafc', borderRadius: 10 }}>
                                                        <FiUsers size={11} className="me-1" />No registration data
                                                    </div>
                                                )}

                                                {/* ── Date timeline ── */}
                                                <div className="row g-2 pt-3" style={{ borderTop: '1px dashed #e2e8f0' }}>
                                                    <div className="col-6">
                                                        <div className="d-flex align-items-center gap-1 mb-1">
                                                            <FiPlayCircle size={12} className="text-muted" />
                                                            <span className="text-muted" style={{ fontSize: 12, letterSpacing: 0.5 }}>LIVE FROM</span>
                                                        </div>
                                                        <div className="fw-semibold" style={{ fontSize: 11 }}>
                                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatDate(task.taskRegistrationLiveFrom)}
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="d-flex align-items-center gap-1 mb-1">
                                                            <FiCalendar size={12} className="text-muted" color={'red'} />
                                                            <span className="text-muted" style={{ fontSize: 12, letterSpacing: 0.5 }}>REG ENDS</span>
                                                        </div>
                                                        <div className="fw-semibold" style={{ fontSize: 11 }}>
                                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatDate(task.taskRegistrationDeadline)}
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="d-flex align-items-center gap-1 mb-1">
                                                            <FiZap size={12} className="text-muted" />
                                                            <span className="text-muted" style={{ fontSize: 12, letterSpacing: 0.5 }}>SUBMIT BY</span>
                                                        </div>
                                                        <div className="fw-semibold" style={{ fontSize: 11 }}>
                                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatDate(task.taskSubmissionDeadline)}
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="d-flex align-items-center gap-1 mb-1">
                                                            <FiCheckCircle size={12} className="text-muted" />
                                                            <span className="text-muted" style={{ fontSize: 12, letterSpacing: 0.5 }}>RESULTS</span>
                                                        </div>
                                                        <div className="fw-semibold" style={{ fontSize: 11 }}>
                                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatDate(task.taskResultDeadline)}
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

                {/* Footer */}
                {!loading && !fetchError && tasks && tasks.length > 0 && pageSlice.length > 0 && (
                    <div className="card-footer py-3" style={{ background: '#fff' }}>
                        <TaskPagination
                            currentPage={safePage} totalPages={totalPages} totalItems={totalItems}
                            from={from} to={to} onPageChange={(p) => setCurrentPage(p)} />
                    </div>
                )}

                <CardLoader refreshKey={refreshKey} />
            </div>
        </div>
    )
}

export default ViewTasks