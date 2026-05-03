'use client'
import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { RotatingLines } from 'react-loader-spinner'
import {
    FiArrowLeft, FiEdit, FiAlertCircle, FiRefreshCw,
    FiCalendar, FiAward, FiUsers, FiBriefcase, FiClock,
    FiCheckCircle, FiActivity, FiTag, FiZap, FiPlayCircle,
    FiHome, FiMail, FiKey, FiEye, FiEyeOff, FiCopy, FiCheck,
    FiDownload, FiFile, FiGithub, FiLink, FiInfo, FiHash,
    FiTarget, FiPaperclip, FiXCircle, FiPower, FiLayers,
} from 'react-icons/fi'
import topTost from '@/utils/topTost'
import { useAuthStore } from '@/store/useAuthStore'

// ══════════════════════════════════════════════════════════
// HELPERS — kept identical to ViewTask.jsx so status, dates
// and gradients render the exact same way across screens
// ══════════════════════════════════════════════════════════

const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatFullDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    })
}

const formatDateTime = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
    })
}

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

const initialsOf = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const formatReward = (amount, type) => {
    if (type === 'cash') {
        const num = Number(amount)
        if (!isNaN(num)) {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency', currency: 'INR', maximumFractionDigits: 0,
            }).format(num)
        }
    }
    return amount
}

const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const REWARD_MEDAL = {
    1: { label: '1st Place', color: '#d97706', bg: '#fef3c7' },
    2: { label: '2nd Place', color: '#64748b', bg: '#f1f5f9' },
    3: { label: '3rd Place', color: '#a16207', bg: '#fef9c3' },
}

const FILE_TYPE_THEME = {
    pdf:  { color: '#dc2626', bg: '#fee2e2' },
    docx: { color: '#2563eb', bg: '#dbeafe' },
    doc:  { color: '#2563eb', bg: '#dbeafe' },
    pptx: { color: '#ea580c', bg: '#ffedd5' },
    ppt:  { color: '#ea580c', bg: '#ffedd5' },
    xlsx: { color: '#16a34a', bg: '#dcfce7' },
    xls:  { color: '#16a34a', bg: '#dcfce7' },
    zip:  { color: '#7c3aed', bg: '#ede9fe' },
    png:  { color: '#0891b2', bg: '#cffafe' },
    jpg:  { color: '#0891b2', bg: '#cffafe' },
    jpeg: { color: '#0891b2', bg: '#cffafe' },
}

const filenameFromUrl = (url) => {
    if (!url) return ''
    try {
        const path = url.split('?')[0].split('#')[0]
        return path.split('/').pop() || 'document'
    } catch {
        return 'document'
    }
}

// ══════════════════════════════════════════════════════════
// REGISTRATION STATE — single source of truth for the
// Register button's label, disabled flag and subtitle.
// Returns { canRegister, label, sublabel, tone }.
// ══════════════════════════════════════════════════════════

const getRegistrationState = ({ task, isRegistered }) => {
    if (!task) return { canRegister: false, label: 'Loading…', sublabel: '', tone: 'secondary' }

    if (isRegistered) return {
        canRegister: false, tone: 'success',
        label: '✓ Registered',
        sublabel: "You're in. We'll notify you of important updates.",
    }

    if (!task.isLive) return {
        canRegister: false, tone: 'secondary',
        label: 'Task is not active',
        sublabel: 'Registration is currently disabled by the organizer.',
    }

    const now = new Date()
    const liveFrom = task.taskRegistrationLiveFrom ? new Date(task.taskRegistrationLiveFrom) : null
    const regEnd   = task.taskRegistrationDeadline ? new Date(task.taskRegistrationDeadline) : null

    if (liveFrom && now < liveFrom) return {
        canRegister: false, tone: 'secondary',
        label: `Opens ${formatFullDate(liveFrom)}`,
        sublabel: `Registration starts in ${timeUntil(liveFrom)}`,
    }

    if (regEnd && now > regEnd) return {
        canRegister: false, tone: 'secondary',
        label: 'Registration closed',
        sublabel: `Registration ended on ${formatFullDate(regEnd)}`,
    }

    return {
        canRegister: true, tone: 'primary',
        label: 'Register for this task',
        sublabel: 'Free to register · No obligation to submit',
    }
}

// ══════════════════════════════════════════════════════════
// SKELETON — matches new bento grid layout
// ══════════════════════════════════════════════════════════

const DetailsSkeleton = () => (
    <div className="placeholder-glow">
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
            <div className="card-body p-3 p-md-4">
                <span className="placeholder bg-secondary rounded mb-3" style={{ width: 120, height: 14, display: 'block' }} />
                <span className="placeholder bg-secondary rounded mb-2" style={{ width: '70%', height: 28, display: 'block' }} />
                <span className="placeholder bg-secondary rounded mb-3" style={{ width: '90%', height: 14, display: 'block' }} />
                <div className="d-flex gap-2 flex-wrap">
                    <span className="placeholder bg-secondary rounded" style={{ width: 110, height: 28, display: 'inline-block' }} />
                    <span className="placeholder bg-secondary rounded" style={{ width: 80, height: 28, display: 'inline-block' }} />
                </div>
            </div>
        </div>
        <div className="row g-3 g-md-4">
            {[
                'col-12 col-lg-8', 'col-12 col-lg-4',
                'col-12 col-lg-8', 'col-12 col-lg-4',
                'col-12 col-lg-8', 'col-12 col-lg-4',
                'col-12 col-md-6 col-lg-4', 'col-12 col-md-6 col-lg-4', 'col-12 col-md-12 col-lg-4',
            ].map((cls, i) => (
                <div key={i} className={cls}>
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <div className="card-body p-3 p-md-4">
                            <span className="placeholder bg-secondary rounded mb-3" style={{ width: 140, height: 16, display: 'block' }} />
                            <span className="placeholder bg-secondary rounded mb-2" style={{ width: '100%', height: 12, display: 'block' }} />
                            <span className="placeholder bg-secondary rounded mb-2" style={{ width: '95%', height: 12, display: 'block' }} />
                            <span className="placeholder bg-secondary rounded" style={{ width: '60%', height: 12, display: 'block' }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
)

// ══════════════════════════════════════════════════════════
// SMALL VISUAL PRIMITIVES
// ══════════════════════════════════════════════════════════

const SectionTitle = ({ icon: Icon, title, action }) => (
    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
            {Icon && (
                <span className="d-inline-flex align-items-center justify-content-center rounded-2"
                    style={{ width: 28, height: 28, background: '#f1f5f9', color: '#475569' }}>
                    <Icon size={15} />
                </span>
            )}
            <span style={{ color: '#0f172a' }}>{title}</span>
        </h6>
        {action}
    </div>
)

const InfoRow = ({ icon: Icon, label, value, valueColor }) => (
    <div className="d-flex align-items-start justify-content-between gap-3 py-2"
        style={{ borderBottom: '1px dashed #e5e7eb' }}>
        <span className="d-flex align-items-center gap-2 fs-12 text-muted">
            {Icon && <Icon size={13} />}
            {label}
        </span>
        <span className="fs-12 fw-semibold text-end" style={{ color: valueColor || '#0f172a' }}>
            {value}
        </span>
    </div>
)

// Compact stat tile used in the hero — adds quick-glance info below title
const StatPill = ({ icon: Icon, label, value, color = '#475569', bg = '#f1f5f9' }) => (
    <div className="d-flex align-items-center gap-2 p-2 p-md-3 rounded-3 h-100"
        style={{ background: bg, border: `1px solid ${bg}` }}>
        <span className="d-inline-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
            style={{ width: 32, height: 32, background: 'white', color }}>
            <Icon size={15} />
        </span>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="fs-11 text-uppercase fw-semibold text-truncate" style={{ color }}>{label}</div>
            <div className="fs-14 fw-bold text-truncate" style={{ color: '#0f172a' }}>{value}</div>
        </div>
    </div>
)

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

const ViewTaskDetails = () => {
    const { id } = useParams()
    const router = useRouter()
    const role = useAuthStore((s) => s.user.role)

    const [task, setTask] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState('')

    const [showPassKey, setShowPassKey] = useState(false)
    const [copied, setCopied] = useState(false)

    // Registration state
    const [registering, setRegistering] = useState(false)
    const [isRegistered, setIsRegistered] = useState(false)

    const canEdit = ['superAdmin', 'orgAdmin', 'branchAdmin'].includes(role)
    const canSeePassKey = ['superAdmin', 'orgAdmin', 'branchAdmin'].includes(role)

    const fetchTask = async () => {
        if (!id) return
        try {
            setLoading(true)
            setErrorMsg('')
            const res = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/get-task-by-id/${id}`,
                { withCredentials: true }
            )
            if (res?.data?.success && res?.data?.data) {
                setTask(res.data.data)
                // Backend can include this — falls back to false if absent
                setIsRegistered(Boolean(res.data.data.isRegistered))
            } else {
                setErrorMsg(res?.data?.message || 'Task not found')
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to load task'
            setErrorMsg(msg)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTask()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    // ── derived state — all hooks above the early returns ──
    const status = useMemo(() => (task ? getTaskStatus(task) : null), [task])

    const totalReward = useMemo(() => {
        if (!task || task.taskRewardType !== 'cash') return null
        const arr = Array.isArray(task.taskRewards) ? task.taskRewards : []
        const total = arr.reduce((acc, r) => {
            const n = Number(r); return acc + (isNaN(n) ? 0 : n)
        }, 0)
        if (!total) return null
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0,
        }).format(total)
    }, [task])

    const regState = useMemo(
        () => getRegistrationState({ task, isRegistered }),
        [task, isRegistered]
    )

    const copyPassKey = async () => {
        if (!task?.passKey) return
        try {
            await navigator.clipboard.writeText(task.passKey)
            setCopied(true)
            topTost?.('success', 'Pass key copied to clipboard')
            setTimeout(() => setCopied(false), 2000)
        } catch {
            topTost?.('error', 'Could not copy pass key')
        }
    }

    const handleRegister = async () => {
        if (!regState.canRegister || registering) return
        try {
            setRegistering(true)
            const res = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/register-for-task/${id}`,
                { withCredentials: true }
            )
            if (res?.data?.success) {
                topTost?.('success', 'Successfully registered for this task')
                setIsRegistered(true)
            } else {
                topTost?.('error', res?.data?.message || 'Registration failed')
            }
        } catch (err) {
            topTost?.('error', err?.response?.data?.message || 'Registration failed')
        } finally {
            setRegistering(false)
        }
    }

    // ─────────────────────────────────────────────
    // LOADING
    // ─────────────────────────────────────────────
    if (loading) {
        return (
            <div className="col-12">
                <DetailsSkeleton />
            </div>
        )
    }

    // ─────────────────────────────────────────────
    // ERROR
    // ─────────────────────────────────────────────
    if (errorMsg || !task) {
        return (
            <div className="col-12">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                    <div className="card-body text-center py-5 px-3">
                        <div className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 64, height: 64, background: '#fee2e2', color: '#dc2626' }}>
                            <FiAlertCircle size={28} />
                        </div>
                        <h5 className="fw-bold mb-2">Couldn't load this task</h5>
                        <p className="text-muted mb-4">{errorMsg || 'The task you are looking for does not exist.'}</p>
                        <div className="d-flex gap-2 justify-content-center flex-wrap">
                            <button onClick={fetchTask} className="btn btn-primary d-inline-flex align-items-center gap-2">
                                <FiRefreshCw size={14} /> Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ─────────────────────────────────────────────
    // DATA
    // ─────────────────────────────────────────────
    const StatusIcon = status.icon
    const docFilename = filenameFromUrl(task.taskDocument)
    const tags = Array.isArray(task.taskTags) ? task.taskTags : []
    const constraints = Array.isArray(task.taskConstraints) ? task.taskConstraints : []
    const evaluators = Array.isArray(task.evaluators) ? task.evaluators : []
    const rewards = Array.isArray(task.taskRewards) ? task.taskRewards : []
    const fileTypes = Array.isArray(task.fileAcceptType) ? task.fileAcceptType : []

    return (
        <div className="col-12">

            {/* ══════════════════════════════════════════════════
                HERO — full width, with stat tiles in a grid
            ══════════════════════════════════════════════════ */}
            <div className="card border-0 shadow-sm mb-3 mb-md-4 overflow-hidden" style={{ borderRadius: 14 }}>
                <div style={{ height: 5, background: status.accent }} />
                <div className="card-body p-3 p-md-4">
                    <div className="d-flex align-items-start gap-3 flex-wrap">
                        {/* <div className="d-flex align-items-center justify-content-center rounded-3 text-white flex-shrink-0"
                            style={{
                               fontWeight: 700, fontSize: 18,
                                background: gradientForString(task.taskTitle || task._id),
                            }}>
                            #{task.taskNo ?? '–'}
                        </div> */}
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                <span className="fs-12 text-muted d-inline-flex align-items-center gap-1">
                                    <FiHash size={12} /> Task {task.taskNo ?? '—'}
                                </span>
                                <span className="text-muted">•</span>
                                <span className="badge d-inline-flex align-items-center gap-1"
                                    style={{
                                        background: status.bg, color: status.color,
                                        padding: '4px 10px', borderRadius: 20, fontWeight: 600,
                                    }}>
                                    <StatusIcon size={12} /> {status.label}
                                </span>
                                {status.nextDate && (
                                    <span className="fs-12 text-muted">
                                        · {status.nextLabel} <strong>{timeUntil(status.nextDate)}</strong>
                                    </span>
                                )}
                            </div>
                            <h4 className="fw-bold mb-2" style={{ color: '#0f172a' }}>
                                {task.taskTitle.toUpperCase()}
                            </h4>
                            <p className="text-muted mb-3" style={{ lineHeight: 1.6 }}>
                                {task.taskDescription}
                            </p>
                            <div className="d-flex flex-wrap gap-2">
                                <span className={`badge d-inline-flex align-items-center gap-1 ${task.isLive ? 'bg-soft-success text-success' : 'bg-soft-secondary text-secondary'}`}
                                    style={{ padding: '6px 10px' }}>
                                    <FiPower size={12} /> {task.isLive ? 'Live' : 'Inactive'}
                                </span>
                                <span className={`badge d-inline-flex align-items-center gap-1 ${task.isResultDeclared ? 'bg-soft-info text-info' : 'bg-soft-warning text-warning'}`}
                                    style={{ padding: '6px 10px' }}>
                                    <FiAward size={12} /> {task.isResultDeclared ? 'Result Declared' : 'Result Pending'}
                                </span>
                                {task.taskRewardType && (
                                    <span className="badge bg-soft-primary text-primary d-inline-flex align-items-center gap-1"
                                        style={{ padding: '6px 10px' }}>
                                        <FiTarget size={12} /> {task.taskRewardType.toUpperCase()} reward
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── REGISTER ACTION ROW ───────────────────────── */}
                    <div className="d-flex align-items-center gap-3 mt-3 pt-3 flex-wrap"
                        style={{ borderTop: '1px solid #f1f5f9' }}>
                        <button
                            type="button"
                            onClick={handleRegister}
                            disabled={!regState.canRegister || registering}
                            className={`btn fw-semibold d-inline-flex align-items-center justify-content-center gap-2 ${
                                regState.tone === 'success' ? 'btn-success' :
                                regState.tone === 'primary' ? 'btn-primary' :
                                'btn-light'
                            }`}
                            style={{
                                padding: '10px 24px', borderRadius: 10, minWidth: 220,
                                ...(regState.tone === 'secondary' && {
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    color: '#64748b',
                                    cursor: 'not-allowed',
                                }),
                            }}
                        >
                            {registering
                                ? <RotatingLines height="20" width="20" strokeColor="#fff" />
                                : regState.label}
                        </button>
                        <span className="fs-12 text-muted">{regState.sublabel}</span>
                    </div>

                    {/* Stat tiles — 2-up on mobile, 4-up on tablet+ */}
                    <div className="row g-2 g-md-3 mt-3">
                        <div className="col-6 col-md-3">
                            <StatPill icon={FiCheckCircle} label="Constraints"
                                value={constraints.length} color="#1d4ed8" bg="#dbeafe" />
                        </div>
                        <div className="col-6 col-md-3">
                            <StatPill icon={FiUsers} label="Evaluators"
                                value={evaluators.length} color="#7c3aed" bg="#ede9fe" />
                        </div>
                        <div className="col-6 col-md-3">
                            <StatPill icon={FiTag} label="Tags"
                                value={tags.length} color="#0891b2" bg="#cffafe" />
                        </div>
                        <div className="col-6 col-md-3">
                            <StatPill icon={FiAward}
                                label={totalReward ? 'Prize Pool' : 'Reward Type'}
                                value={totalReward || (task.taskRewardType || '—').toUpperCase()}
                                color="#d97706" bg="#fef3c7" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                BENTO GRID
                lg+: paired wide(8) + narrow(4) rows, then 4/4/4 footer
                md:  smaller cards pair (Scope|Tags) — bigger cards stack
                sm/xs: everything stacks
            ══════════════════════════════════════════════════ */}
            <div className="row g-3 g-md-4">

                {/* ── PAIR 1: Constraints | Key Dates ─────────────── */}
                <div className="col-12 col-lg-8">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <div className="card-body p-3 p-md-4">
                            <SectionTitle icon={FiCheckCircle} title="Task Constraints" />
                            {constraints.length === 0 ? (
                                <p className="text-muted fs-13 mb-0">No constraints specified for this task.</p>
                            ) : (
                                <ol className="ps-0 mb-0" style={{ listStyle: 'none' }}>
                                    {constraints.map((c, i) => (
                                        <li key={i} className="d-flex align-items-start gap-3 py-2"
                                            style={{ borderBottom: i < constraints.length - 1 ? '1px dashed #e5e7eb' : 'none' }}>
                                            <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                                                style={{
                                                    width: 24, height: 24, background: '#dbeafe',
                                                    color: '#1d4ed8', fontSize: 11, fontWeight: 700,
                                                }}>
                                                {i + 1}
                                            </span>
                                            <span className="fs-13" style={{ color: '#1f2937', lineHeight: 1.6 }}>
                                                {c}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <div className="card-body p-3 p-md-4">
                            <SectionTitle icon={FiCalendar} title="Key Dates" />
                            <div className="position-relative ps-3" style={{ borderLeft: '2px dashed #e5e7eb' }}>
                                {[
                                    { label: 'Registration Live From', date: task.taskRegistrationLiveFrom, icon: FiPlayCircle, color: '#16a34a' },
                                    { label: 'Registration Closes', date: task.taskRegistrationDeadline, icon: FiClock, color: '#d97706' },
                                    { label: 'Submission Deadline', date: task.taskSubmissionDeadline, icon: FiZap, color: '#2563eb' },
                                    { label: 'Result Deadline', date: task.taskResultDeadline, icon: FiAward, color: '#7c3aed' },
                                ].map((row, i) => (
                                    <div key={i} className="position-relative mb-3">
                                        <span className="position-absolute d-flex align-items-center justify-content-center rounded-circle"
                                            style={{
                                                left: -24, top: 2, width: 22, height: 22,
                                                background: row.color, color: 'white',
                                                boxShadow: '0 0 0 3px white',
                                            }}>
                                            <row.icon size={11} />
                                        </span>
                                        <div className="ps-2">
                                            <div className="fs-11 text-uppercase fw-semibold text-muted">
                                                {row.label}
                                            </div>
                                            <div className="fs-13 fw-semibold" style={{ color: '#0f172a' }}>
                                                {formatFullDate(row.date)}
                                            </div>
                                            {row.date && (
                                                <div className="fs-11 text-muted">
                                                    {formatDateTime(row.date)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── PAIR 2: Submission Requirements | Rewards ─── */}
                <div className="col-12 col-lg-8">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <div className="card-body p-3 p-md-4">
                            <SectionTitle icon={FiPaperclip} title="Submission Requirements" />

                            <div className="mb-3">
                                <span className="fs-12 text-uppercase fw-semibold text-muted">Accepted file formats</span>
                                <div className="d-flex flex-wrap gap-2 mt-2">
                                    {fileTypes.length === 0 ? (
                                        <span className="fs-13 text-muted">No file uploads required</span>
                                    ) : (
                                        fileTypes.map((ft) => {
                                            const theme = FILE_TYPE_THEME[ft.toLowerCase()] || { color: '#475569', bg: '#f1f5f9' }
                                            return (
                                                <span key={ft} className="d-inline-flex align-items-center gap-1 fs-12 fw-semibold text-uppercase"
                                                    style={{
                                                        background: theme.bg, color: theme.color,
                                                        padding: '6px 12px', borderRadius: 8,
                                                    }}>
                                                    <FiFile size={11} /> .{ft}
                                                </span>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-12 col-sm-6">
                                    <div className="d-flex align-items-center gap-2 p-3 rounded-3 h-100"
                                        style={{ background: task.acceptGithubLink ? '#f0fdf4' : '#f9fafb', border: '1px solid ' + (task.acceptGithubLink ? '#bbf7d0' : '#e5e7eb') }}>
                                        <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                                            style={{
                                                width: 32, height: 32,
                                                background: task.acceptGithubLink ? '#16a34a' : '#cbd5e1',
                                                color: 'white',
                                            }}>
                                            <FiGithub size={15} />
                                        </span>
                                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                            <div className="fs-13 fw-semibold" style={{ color: '#0f172a' }}>GitHub Link</div>
                                            <div className="fs-11 text-muted">
                                                {task.acceptGithubLink ? 'Accepted' : 'Not accepted'}
                                            </div>
                                        </div>
                                        {task.acceptGithubLink ? (
                                            <FiCheckCircle size={18} style={{ color: '#16a34a' }} />
                                        ) : (
                                            <FiXCircle size={18} style={{ color: '#94a3b8' }} />
                                        )}
                                    </div>
                                </div>
                                <div className="col-12 col-sm-6">
                                    <div className="d-flex align-items-center gap-2 p-3 rounded-3 h-100"
                                        style={{ background: task.acceptLiveLink ? '#f0fdf4' : '#f9fafb', border: '1px solid ' + (task.acceptLiveLink ? '#bbf7d0' : '#e5e7eb') }}>
                                        <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                                            style={{
                                                width: 32, height: 32,
                                                background: task.acceptLiveLink ? '#16a34a' : '#cbd5e1',
                                                color: 'white',
                                            }}>
                                            <FiLink size={15} />
                                        </span>
                                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                            <div className="fs-13 fw-semibold" style={{ color: '#0f172a' }}>Live Demo Link</div>
                                            <div className="fs-11 text-muted">
                                                {task.acceptLiveLink ? 'Accepted' : 'Not accepted'}
                                            </div>
                                        </div>
                                        {task.acceptLiveLink ? (
                                            <FiCheckCircle size={18} style={{ color: '#16a34a' }} />
                                        ) : (
                                            <FiXCircle size={18} style={{ color: '#94a3b8' }} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <div className="card-body p-3 p-md-4">
                            <SectionTitle
                                icon={FiAward}
                                title="Rewards"
                                action={
                                    <span className="fs-11 text-muted text-uppercase fw-semibold">
                                        {task.taskRewardType}
                                    </span>
                                }
                            />
                            {rewards.length === 0 ? (
                                <p className="text-muted fs-13 mb-0">No rewards listed.</p>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    {rewards.map((amt, i) => {
                                        const medal = REWARD_MEDAL[i + 1] || { label: `${ordinal(i + 1)} Place`, color: '#475569', bg: '#f1f5f9' }
                                        return (
                                            <div key={i} className="d-flex align-items-center gap-3 p-3 rounded-3"
                                                style={{ background: medal.bg }}>
                                                <span className="d-inline-flex align-items-center justify-content-center rounded-circle text-white flex-shrink-0"
                                                    style={{
                                                        width: 36, height: 36, background: medal.color,
                                                        fontWeight: 700, fontSize: 13,
                                                    }}>
                                                    {i + 1}
                                                </span>
                                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                    <div className="fs-11 text-uppercase fw-semibold" style={{ color: medal.color }}>
                                                        {medal.label}
                                                    </div>
                                                    <div className="fs-15 fw-bold text-truncate" style={{ color: '#0f172a' }}>
                                                        {formatReward(amt, task.taskRewardType)}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── PAIR 3: Evaluators | Document ───────────────── */}
                <div className="col-12 col-lg-8">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <div className="card-body p-3 p-md-4">
                            <SectionTitle
                                icon={FiUsers}
                                title="Evaluators"
                                action={
                                    <span className="badge bg-soft-primary text-primary"
                                        style={{ padding: '4px 10px', borderRadius: 20 }}>
                                        {evaluators.length} {evaluators.length === 1 ? 'person' : 'people'}
                                    </span>
                                }
                            />
                            {evaluators.length === 0 ? (
                                <p className="text-muted fs-13 mb-0">No evaluators assigned yet.</p>
                            ) : (
                                <div className="row g-3">
                                    {evaluators.map((ev) => (
                                        <div key={ev._id} className="col-12 col-sm-6 col-xl-6">
                                            <div className="d-flex align-items-center gap-3 p-3 rounded-3 h-100"
                                                style={{ background: '#fafbfc', border: '1px solid #e5e7eb' }}>
                                                <div className="d-flex align-items-center justify-content-center rounded-circle text-white flex-shrink-0"
                                                    style={{
                                                        width: 42, height: 42,
                                                        background: gradientForString(ev.name),
                                                        fontWeight: 700, fontSize: 13,
                                                    }}>
                                                    {initialsOf(ev.name)}
                                                </div>
                                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                    <div className="fs-13 fw-semibold text-truncate" style={{ color: '#0f172a' }}>
                                                        {ev.name}
                                                    </div>
                                                    {ev.email && (
                                                        <a href={`mailto:${ev.email}`}
                                                            className="fs-11 text-muted text-truncate d-block text-decoration-none"
                                                            style={{ maxWidth: '100%' }}>
                                                            <FiMail size={10} className="me-1" />{ev.email}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <div className="card-body p-3 p-md-4 d-flex flex-column">
                            <SectionTitle icon={FiPaperclip} title="Task Document" />
                            {!task.taskDocument ? (
                                <p className="text-muted fs-13 mb-0">No document attached.</p>
                            ) : (
                                <>
                                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 mb-3 flex-grow-1"
                                        style={{ background: '#fafbfc', border: '1px solid #e5e7eb' }}>
                                        <span className="d-inline-flex align-items-center justify-content-center rounded-3 text-white flex-shrink-0"
                                            style={{
                                                width: 42, height: 42,
                                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            }}>
                                            <FiFile size={20} />
                                        </span>
                                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                            <div className="fs-13 fw-semibold text-truncate" style={{ color: '#0f172a' }}>
                                                {docFilename}
                                            </div>
                                            <div className="fs-11 text-muted">Reference document</div>
                                        </div>
                                    </div>
                                    <a href={process.env.NEXT_PUBLIC_S3_BASE_URL + task.taskDocument}
                                        download={docFilename}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2">
                                        <FiDownload size={14} /> Download Document
                                    </a>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── ROW 4: Scope | Tags | Activity (4/4/4 at lg, paired at md) ── */}
                <div className="col-12 col-md-6 col-lg-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <div className="card-body p-3 p-md-4">
                            <SectionTitle icon={FiBriefcase} title="Scope" />
                            <InfoRow icon={FiHome} label="Organization"
                                value={task.orgScope?.orgName || '—'} />
                            <InfoRow icon={FiBriefcase} label="Branch"
                                value={task.branchScope?.branchName || '—'} />
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-6 col-lg-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <div className="card-body p-3 p-md-4">
                            <SectionTitle icon={FiTag} title="Tags" />
                            {tags.length === 0 ? (
                                <p className="text-muted fs-13 mb-0">No tags applied.</p>
                            ) : (
                                <div className="d-flex flex-wrap gap-2">
                                    {tags.map((t) => (
                                        <span key={t._id}
                                            className="d-inline-flex align-items-center fs-12 fw-semibold"
                                            style={{
                                                padding: '6px 12px', borderRadius: 20,
                                                background: '#f1f5f9', color: '#475569',
                                                border: '1px solid #e2e8f0',
                                            }}>
                                            {t.TagName}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-12 col-lg-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <div className="card-body p-3 p-md-4">
                            <SectionTitle icon={FiInfo} title="Activity" />
                            <InfoRow icon={FiClock} label="Created on"
                                value={formatFullDate(task.createdAt)} />
                            <InfoRow icon={FiRefreshCw} label="Last updated"
                                value={formatFullDate(task.updatedAt)} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default ViewTaskDetails