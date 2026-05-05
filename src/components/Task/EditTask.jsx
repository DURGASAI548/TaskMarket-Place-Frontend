'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'
import SelectDropdown from '@/components/shared/SelectDropdown'
import MultiSelectTags from '@/components/shared/MultiSelectTags'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
    FiSave, FiFileText, FiCalendar, FiAward, FiTag, FiSettings,
    FiKey, FiUsers, FiBriefcase, FiHash, FiToggleLeft, FiInfo, FiLink,
    FiGithub, FiUpload, FiFile, FiX, FiAlertCircle, FiRefreshCw, FiDownload,
} from 'react-icons/fi'

// ══════════════════════════════════════════════════════════
// VALIDATORS — identical to AddTask
// ══════════════════════════════════════════════════════════

const validateTitle = (v) => {
    const t = (v || '').trim()
    if (!t) return 'Task title is required'
    if (t.length < 3) return 'Title must be at least 3 characters'
    if (t.length > 200) return 'Title must be under 200 characters'
    return ''
}

const validateDescription = (v) => {
    const t = (v || '').trim()
    if (!t) return 'Task description is required'
    if (t.length < 10) return 'Description must be at least 10 characters'
    if (t.length > 5000) return 'Description must be under 5000 characters'
    return ''
}

const validateRequiredDate = (label) => (v) => {
    if (!v) return `${label} is required`
    if (!(v instanceof Date) || Number.isNaN(v.getTime())) return `${label} is invalid`
    return ''
}

const validateRewardType = (v) => (!v ? 'Please select a reward type' : '')

const validateRewardNo = (v) => {
    if (v === '' || v === null || v === undefined) return 'Reward count is required'
    const n = Number(v)
    if (Number.isNaN(n)) return 'Must be a number'
    if (n < 1) return 'Must have at least 1 reward'
    if (n > 50) return 'Maximum 50 rewards allowed'
    if (!Number.isInteger(n)) return 'Must be a whole number'
    return ''
}

const validateRewardsArray = (arr, expectedCount) => {
    if (!Array.isArray(arr) || arr.length !== expectedCount) {
        return `Please fill all ${expectedCount} reward details`
    }
    for (let i = 0; i < arr.length; i++) {
        const t = (arr[i] || '').trim()
        if (!t) return `Reward #${i + 1} is required`
        if (t.length > 200) return `Reward #${i + 1} must be under 200 characters`
    }
    return ''
}

const validateOrganization = (v) => (!v ? 'Please select organization scope' : '')
const validateTags         = (arr) => (!arr || arr.length === 0 ? 'Select at least one tag' : '')
const validateEvaluators   = (arr) => (!arr || arr.length === 0 ? 'Select at least one evaluator' : '')
const validateFileTypes    = (arr) => (!arr || arr.length === 0 ? 'Select at least one file type' : '')

const validateTaskDocument = (file) => {
    if (!file) return ''
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg', 'text/plain']
    const allowedExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.txt']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowed.includes(file.type) && !allowedExts.includes(ext))
        return 'Allowed: PDF, DOC, DOCX, PPT, PPTX, PNG, JPG, TXT'
    if (file.size > 10 * 1024 * 1024) return 'File size must be under 10MB'
    if (file.size === 0) return 'File is empty'
    return ''
}

// ══════════════════════════════════════════════════════════
// CONSTANTS — identical to AddTask
// ══════════════════════════════════════════════════════════

const REWARD_TYPE_OPTIONS = [
    { value: 'cash',        label: 'Cash' },
    { value: 'certificate', label: 'Certificate' },
]

const FILE_TYPE_OPTIONS = [
    { value: 'pdf',  label: 'PDF',  color: '#dc2626' },
    { value: 'docx', label: 'DOCX', color: '#2563eb' },
    { value: 'pptx', label: 'PPTX', color: '#ea580c' },
    { value: 'xlsx', label: 'XLSX', color: '#16a34a' },
    { value: 'zip',  label: 'ZIP',  color: '#7c3aed' },
    { value: 'png',  label: 'PNG',  color: '#0891b2' },
    { value: 'jpg',  label: 'JPG',  color: '#0891b2' },
    { value: 'mp4',  label: 'MP4',  color: '#be185d' },
    { value: 'txt',  label: 'TXT',  color: '#64748b' },
]

const initialForm = {
    taskNo: '',
    taskTitle: '',
    taskDescription: '',
    taskSubmissionDeadline: null,
    taskRegistrationDeadline: null,
    taskRegistrationLiveFrom: null,
    taskRewardType: null,
    taskRewardNo: '',
    taskRewards: [],
    isLive: false,
    taskTags: [],
    taskConstraints: [],
    fileAcceptType: [],
    acceptGithubLink: false,
    acceptLiveLink: false,
    branchScope: null,
    orgScope: null,
    passKey: '',
    evaluators: [],
    taskResultDeadline: null,
}

const validators = {
    taskTitle: validateTitle,
    taskDescription: validateDescription,
    taskSubmissionDeadline: validateRequiredDate('Submission deadline'),
    taskRegistrationDeadline: validateRequiredDate('Registration deadline'),
    taskRegistrationLiveFrom: validateRequiredDate('Registration live from'),
    taskRewardType: validateRewardType,
    taskRewardNo: validateRewardNo,
    taskTags: validateTags,
    fileAcceptType: validateFileTypes,
    orgScope: validateOrganization,
    evaluators: validateEvaluators,
    taskResultDeadline: validateRequiredDate('Result deadline'),
}

const keys = Object.keys(initialForm)
const createTouched = () => keys.reduce((a, k) => ({ ...a, [k]: false }), {})
const createErrors  = () => keys.reduce((a, k) => ({ ...a, [k]: '' }), {})

const toDate = (v) => {
    if (!v) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
}

const filenameFromUrl = (url) => {
    if (!url) return ''
    try {
        const path = String(url).split('?')[0].split('#')[0]
        return path.split('/').pop() || 'document'
    } catch { return 'document' }
}

// ══════════════════════════════════════════════════════════
// FIELD PRIMITIVES — defined outside component so they don't
// remount on every parent render
// ══════════════════════════════════════════════════════════

const InputRow = ({ label, icon: Icon, fieldKey, type = 'text', inputRef, placeholder, maxLength, value, touched, error, onChange, onBlur, disabled, required = true, min, max }) => (
    <div className="mb-4">
        <label className="form-label fw-semibold">
            {label} {required && <span className="text-danger">*</span>}
        </label>
        <div className="position-relative">
            {Icon && <Icon size={15} className="text-muted position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />}
            <input ref={inputRef} type={type} min={min} max={max}
                className={`form-control ${Icon ? 'ps-5' : ''} ${touched ? (error ? 'is-invalid' : '') : ''}`}
                placeholder={placeholder} value={value}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                onBlur={() => onBlur(fieldKey)}
                disabled={disabled} maxLength={maxLength} />
        </div>
        {touched && error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
)

const TextAreaRow = ({ label, fieldKey, rows = 4, placeholder, maxLength, value, touched, error, onChange, onBlur, disabled, required = true }) => (
    <div className="mb-4">
        <label className="form-label fw-semibold">
            {label} {required && <span className="text-danger">*</span>}
        </label>
        <textarea rows={rows}
            className={`form-control ${touched ? (error ? 'is-invalid' : '') : ''}`}
            placeholder={placeholder} value={value}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            onBlur={() => onBlur(fieldKey)}
            disabled={disabled} maxLength={maxLength} />
        {touched && error && <div className="invalid-feedback d-block">{error}</div>}
        {maxLength && (
            <div className="d-flex justify-content-end mt-1">
                <small className={`${value.length > maxLength * 0.9 ? 'text-warning' : 'text-muted'} ${value.length >= maxLength ? 'text-danger' : ''}`}>
                    {value.length}/{maxLength}
                </small>
            </div>
        )}
    </div>
)

// IMPORTANT: defined OUTSIDE the component so React doesn't remount
// the SelectDropdown on every parent re-render
const DropdownField = ({ label, options, loading, loadingText, selectedValue, touched, error, fieldKey, onSelect, hint, required = true ,defaultValue }) => {
    const selected = options.find((o) => o.value === selectedValue) || null
    console.log(defaultValue)
    return (
        <div className="mb-4">
            <label className="form-label fw-semibold">
                {label}{' '}
                {required
                    ? <span className="text-danger">*</span>
                    : <span className="text-muted fs-11 ms-1">(optional)</span>
                }
            </label>
            {loading ? (
                <div className="d-flex align-items-center py-2">
                    <RotatingLines visible height="22" width="22" color="blue" strokeWidth="5" animationDuration="0.75" />
                    <span className="text-muted fs-13 ms-2">{loadingText}</span>
                </div>
            ) : (
                <>
                    {/* Force a remount when the prefilled value first arrives.
                        Some SelectDropdown implementations only read selectedOption
                        on mount; keying by value guarantees the prefill shows. */}
                    <SelectDropdown
                    // defaultSelect
                        key={`${fieldKey}-${selectedValue ?? 'none'}`}
                        options={options}
                        selectedOption={selected}
                        defaultSelect={selected?.label || ''}
                        onSelectOption={(option) => onSelect(fieldKey, option)}
                    />
                    {hint && !error && options.length === 0 && <div className="text-muted fs-11 mt-1">{hint}</div>}
                    {touched && error && <div className="invalid-feedback d-block">{error}</div>}
                </>
            )}
        </div>
    )
}

const DatePickerField = ({ label, fieldKey, value, touched, error, onChange, onBlur, disabled, minDate, placeholder = 'Select date & time', required = true }) => {
    let minTime, maxTime
    if (minDate) {
        const isSameDay =
            value &&
            value.getFullYear() === minDate.getFullYear() &&
            value.getMonth()    === minDate.getMonth() &&
            value.getDate()     === minDate.getDate()

        if (isSameDay || !value) {
            minTime = minDate
            maxTime = new Date(minDate)
            maxTime.setHours(23, 59, 59, 999)
        }
    }

    return (
        <div className="mb-4">
            <label className="form-label fw-semibold d-block">
                {label} {required && <span className="text-danger">*</span>}
            </label>
            <div className="position-relative">
                <FiCalendar size={15} className="text-muted position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }} />
                <DatePicker selected={value}
                    onChange={(date) => { onChange(fieldKey, date); onBlur(fieldKey) }}
                    showTimeSelect dateFormat="MMM d, yyyy h:mm aa"
                    placeholderText={placeholder} showPopperArrow={false}
                    minDate={minDate} minTime={minTime} maxTime={maxTime}
                    className={`form-control ps-5 ${touched ? (error ? 'is-invalid' : '') : ''}`}
                    wrapperClassName="w-100" disabled={disabled} popperPlacement="bottom-start" />
            </div>
            {touched && error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
    )
}

const SectionDivider = ({ icon: Icon, title, subtitle }) => (
    <div className="d-flex align-items-center mb-4 mt-2">
        <div className="d-flex align-items-center justify-content-center rounded-2 me-3 flex-shrink-0" style={{ width: 36, height: 36, background: '#eef2ff' }}>
            <Icon size={16} className="text-primary" />
        </div>
        <div>
            <h6 className="fw-bold mb-0 fs-13">{title}</h6>
            {subtitle && <p className="text-muted fs-11 mb-0">{subtitle}</p>}
        </div>
    </div>
)

const SwitchField = ({ label, subtitle, checked, onChange, disabled, icon: Icon }) => (
    <div className="mb-3 d-flex align-items-start gap-3 p-3 rounded-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
        {Icon && (
            <div className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0" style={{ width: 36, height: 36, background: '#fff', border: '1px solid #e5e7eb' }}>
                <Icon size={16} className="text-primary" />
            </div>
        )}
        <div className="flex-grow-1">
            <label className="form-label fw-semibold mb-0 d-block">{label}</label>
            {subtitle && <span className="fs-11 text-muted">{subtitle}</span>}
        </div>
        <div className="form-check form-switch mb-0 mt-1">
            <input className="form-check-input c-pointer" type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
        </div>
    </div>
)

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

const EditTask = () => {
    const API = process.env.NEXT_PUBLIC_API_URL
    const { id } = useParams()
    const router = useRouter()

    const [form,    setForm]    = useState({ ...initialForm })
    const [errors,  setErrors]  = useState(createErrors())
    const [touched, setTouched] = useState(createTouched())
    const [submitting, setSubmitting] = useState(false)

    const [rewardArrayError, setRewardArrayError] = useState('')

    // Existing document URL from backend, plus optional new file
    const [existingDocUrl, setExistingDocUrl] = useState('')
    const [taskDocFile,  setTaskDocFile]  = useState(null)
    const [taskDocError, setTaskDocError] = useState('')
    const taskDocInputRef = useRef(null)

    const [orgWithBranches,     setOrgWithBranches]     = useState([])
    const [organizationOptions, setOrganizationOptions] = useState([])
    const [branchOptions,       setBranchOptions]       = useState([])
    const [loadingDropdowns,    setLoadingDropdowns]    = useState(true)

    const [tagOptions,             setTagOptions]             = useState([])
    const [defaultSelectedTags,    setDefaultSelectedTags]    = useState([])
    const [evaluatorOptions,       setEvaluatorOptions]       = useState([])
    const [defaultSelectedEvals,   setDefaultSelectedEvals]   = useState([])
    const [defaultSelectedFiles,   setDefaultSelectedFiles]   = useState([])
    const [loadingTags,            setLoadingTags]            = useState(true)
    const [loadingEvaluators,      setLoadingEvaluators]      = useState(false)

    // Initial-load state
    const [loadingTaskData, setLoadingTaskData] = useState(true)
    const [fetchError,      setFetchError]      = useState('')

    const [constraintInput, setConstraintInput] = useState('')

    const initialOrgRef = useRef(null)
    const didPrefillRef = useRef(false)

    const taskTitleRef    = useRef(null)
    const taskDescRef     = useRef(null)
    const taskRewardNoRef = useRef(null)
    const firstRewardRef  = useRef(null)

    // ── INITIAL LOAD ──────────────────────────────────────
    useEffect(() => {
        if (!id) return
        const loadAll = async () => {
            try {
                setLoadingTaskData(true)
                setFetchError('')

                const [taskRes, orgRes, tagRes] = await Promise.all([
                    axios.get(`${API}/api/get-task-by-for-edit-id/${id}`,   { withCredentials: true }),
                    axios.get(`${API}/api/get-org-with-branches`,  { withCredentials: true }).catch(() => ({ data: { data: [] } })),
                    axios.get(`${API}/api/get-all-tags`,           { withCredentials: true }).catch(() => ({ data: { data: [] } })),
                ])

                // ── Orgs/branches ─────────────────────────
                const orgData = orgRes.data?.data || []
                setOrgWithBranches(orgData)
                setOrganizationOptions(
                    orgData.map((o) => ({ value: o.organizationId, label: o.organizationName, img: '' }))
                )

                // ── Tags ──────────────────────────────────
                const tagData = tagRes.data?.data || []
                setTagOptions(
                    tagData.map((t) => ({
                        value: t._id || t.tagId,
                        label: t.TagName || t.name,
                        color: t.color || '#4f46e5',
                    }))
                )

                // ── Task itself ───────────────────────────
                const task = taskRes.data?.data || taskRes.data
                if (!task || !(task._id || task.taskNo)) {
                    throw new Error('Task not found')
                }

                // Build pre-selected MultiSelectTags arrays from the populated
                // task response (these are full objects, not just ids)
                const taskTagsArr = Array.isArray(task.taskTags) ? task.taskTags : []
                setDefaultSelectedTags(
                    taskTagsArr
                        .filter((t) => t && (typeof t === 'object'))
                        .map((t) => ({
                            value: t._id || t.tagId,
                            label: t.TagName || t.name,
                            color: t.color || '#4f46e5',
                        }))
                )

                const fileTypesArr = Array.isArray(task.fileAcceptType) ? task.fileAcceptType : []
                setDefaultSelectedFiles(
                    fileTypesArr.map((ft) => {
                        // Match against catalog so we get the correct color/label
                        const fromCatalog = FILE_TYPE_OPTIONS.find((o) => o.value === ft)
                        return fromCatalog || { value: ft, label: String(ft).toUpperCase(), color: '#4f46e5' }
                    })
                )

                const evaluatorsArr = Array.isArray(task.evaluators) ? task.evaluators : []
                setDefaultSelectedEvals(
                    evaluatorsArr
                        .filter((e) => e && (typeof e === 'object'))
                        .map((e) => ({
                            value: e._id,
                            label: e.name || e.displayName || e.email || 'Unknown',
                            color: '#0891b2',
                        }))
                )

                // Normalize ids — backend may populate refs as objects OR send raw ids
                const orgId    = task.orgScope?._id    || task.orgScope    || null
                const branchId = task.branchScope?._id || task.branchScope || null

                const tagIds = taskTagsArr
                    .map((t) => (typeof t === 'object' ? t._id : t))
                    .filter(Boolean)

                const evaluatorIds = evaluatorsArr
                    .map((e) => (typeof e === 'object' ? e._id : e))
                    .filter(Boolean)

                // Pre-populate the matching org's branch list immediately
                if (orgId) {
                    const matched = orgData.find((o) => o.organizationId === orgId)
                    setBranchOptions(
                        (matched?.branchesEligible || []).map((b) => ({
                            value: b.branchId,
                            label: b.branchName,
                            img: '',
                        }))
                    )
                }

                initialOrgRef.current = orgId

                setForm({
                    taskNo: task.taskNo != null ? String(task.taskNo) : '',
                    taskTitle: task.taskTitle || '',
                    taskDescription: task.taskDescription || '',
                    taskSubmissionDeadline:   toDate(task.taskSubmissionDeadline),
                    taskRegistrationDeadline: toDate(task.taskRegistrationDeadline),
                    taskRegistrationLiveFrom: toDate(task.taskRegistrationLiveFrom),
                    taskRewardType: task.taskRewardType || null,
                    taskRewardNo: task.taskRewardNo != null ? String(task.taskRewardNo) : '',
                    taskRewards: Array.isArray(task.taskRewards) ? task.taskRewards.map(String) : [],
                    isLive: Boolean(task.isLive),
                    taskTags: tagIds,
                    taskConstraints: Array.isArray(task.taskConstraints) ? task.taskConstraints : [],
                    fileAcceptType: fileTypesArr,
                    acceptGithubLink: Boolean(task.acceptGithubLink),
                    acceptLiveLink:   Boolean(task.acceptLiveLink),
                    branchScope: branchId,
                    orgScope: orgId,
                    passKey: task.passKey || '',
                    evaluators: evaluatorIds,
                    taskResultDeadline: toDate(task.taskResultDeadline),
                })

                setExistingDocUrl(task.taskDocument || '')
                didPrefillRef.current = true
            } catch (err) {
                console.error('Failed to load task:', err)
                setFetchError(err?.response?.data?.message || err?.message || 'Failed to load task data')
                topTost?.('error', 'Failed to load task data')
            } finally {
                setLoadingTaskData(false)
                setLoadingDropdowns(false)
                setLoadingTags(false)
            }
        }
        loadAll()
    }, [id, API])

    // ── EVALUATORS — refetch when org changes ─────────────
    useEffect(() => {
        if (!form.orgScope) {
            setEvaluatorOptions([])
            return
        }
        const fetchEvaluators = async () => {
            try {
                setLoadingEvaluators(true)
                const res = await axios.get(
                    `${API}/api/get-task-eligible-evaluators/${form.orgScope}`,
                    { withCredentials: true }
                )
                const evalData = res.data?.data || []
                setEvaluatorOptions(
                    evalData.map((e) => ({
                        value: e._id,
                        label: e.name || e.displayName,
                        color: '#0891b2',
                    }))
                )
            } catch (err) {
                console.error('Failed to load evaluators:', err)
                topTost?.('error', 'Failed to load evaluators for this organization.')
                setEvaluatorOptions([])
            } finally {
                setLoadingEvaluators(false)
            }
        }
        fetchEvaluators()
    }, [form.orgScope, API])

    // ── BRANCH list refresh + cascading reset on org change ──
    useEffect(() => {
        if (form.orgScope) {
            const matched = orgWithBranches.find((o) => o.organizationId === form.orgScope)
            setBranchOptions(
                (matched?.branchesEligible || []).map((b) => ({
                    value: b.branchId,
                    label: b.branchName,
                    img: '',
                }))
            )
        } else {
            setBranchOptions([])
        }

        if (!didPrefillRef.current) return
        if (form.orgScope === initialOrgRef.current) return

        // User changed org → drop dependent fields + clear evaluator pre-selection
        setForm((prev) => ({ ...prev, branchScope: null, evaluators: [] }))
        setDefaultSelectedEvals([])
        initialOrgRef.current = form.orgScope
    }, [form.orgScope, orgWithBranches])

    // ── Cascading date validation ──
    useEffect(() => {
        setForm((prev) => {
            const next = { ...prev }
            let changed = false

            if (next.taskRegistrationLiveFrom && next.taskRegistrationDeadline &&
                next.taskRegistrationDeadline < next.taskRegistrationLiveFrom) {
                next.taskRegistrationDeadline = null
                changed = true
            }
            if (next.taskRegistrationDeadline && next.taskSubmissionDeadline &&
                next.taskSubmissionDeadline < next.taskRegistrationDeadline) {
                next.taskSubmissionDeadline = null
                changed = true
            }
            if (next.taskSubmissionDeadline && next.taskResultDeadline &&
                next.taskResultDeadline < next.taskSubmissionDeadline) {
                next.taskResultDeadline = null
                changed = true
            }
            return changed ? next : prev
        })
    }, [
        form.taskRegistrationLiveFrom,
        form.taskRegistrationDeadline,
        form.taskSubmissionDeadline,
    ])

    // ── Reward array length sync ──
    useEffect(() => {
        const n = Number(form.taskRewardNo)
        if (Number.isNaN(n) || n < 1 || n > 50) return

        setForm((prev) => {
            const current = prev.taskRewards || []
            if (current.length === n) return prev

            const next = [...current]
            while (next.length < n) next.push('')
            while (next.length > n) next.pop()
            return { ...prev, taskRewards: next }
        })
    }, [form.taskRewardNo])

    // ── HANDLERS — identical to AddTask ──
    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        if (touched[field] && validators[field]) {
            setErrors((prev) => ({ ...prev, [field]: validators[field](value) }))
        }
    }

    const handleBlur = (field) => {
        if (!validators[field]) return
        setTouched((prev) => ({ ...prev, [field]: true }))
        setErrors((prev) => ({ ...prev, [field]: validators[field](form[field]) }))
    }

    const handleDropdown = (field, option) => {
        const val = option?.value ?? null
        handleChange(field, val)
        if (validators[field]) {
            setTouched((prev) => ({ ...prev, [field]: true }))
            setErrors((prev) => ({ ...prev, [field]: validators[field](val) }))
        }
    }

    const handleMultiSelect = (field, selected) => {
        const values = Array.isArray(selected)
            ? selected.map((s) => (typeof s === 'object' ? s.value : s))
            : []
        setForm((prev) => ({ ...prev, [field]: values }))
        if (validators[field]) {
            setTouched((prev) => ({ ...prev, [field]: true }))
            setErrors((prev) => ({ ...prev, [field]: validators[field](values) }))
        }
    }

    const handleToggle = (field) => {
        setForm((prev) => ({ ...prev, [field]: !prev[field] }))
    }

    const handleRewardChange = (index, value) => {
        setForm((prev) => {
            const next = [...prev.taskRewards]
            next[index] = value
            return { ...prev, taskRewards: next }
        })
        const n = Number(form.taskRewardNo)
        if (rewardArrayError) {
            const updated = [...form.taskRewards]
            updated[index] = value
            setRewardArrayError(validateRewardsArray(updated, n))
        }
    }

    const addConstraint = () => {
        const trimmed = constraintInput.trim()
        if (!trimmed) return
        if (form.taskConstraints.includes(trimmed)) {
            topTost?.('warning', 'Constraint already added')
            return
        }
        setForm((prev) => ({ ...prev, taskConstraints: [...prev.taskConstraints, trimmed] }))
        setConstraintInput('')
    }

    const removeConstraint = (idx) => {
        setForm((prev) => ({ ...prev, taskConstraints: prev.taskConstraints.filter((_, i) => i !== idx) }))
    }

    const handleTaskDocChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const error = validateTaskDocument(file)
        setTaskDocError(error)
        if (!error) setTaskDocFile(file)
        else e.target.value = ''
    }

    const removeTaskDoc = () => {
        setTaskDocFile(null)
        setTaskDocError('')
        if (taskDocInputRef.current) taskDocInputRef.current.value = ''
    }

    // ── SUBMIT ──
    const handleSubmit = async () => {
        const allTouched = Object.keys(validators).reduce((a, k) => ({ ...a, [k]: true }), {})
        setTouched((prev) => ({ ...prev, ...allTouched }))

        const newErrors = {}
        Object.keys(validators).forEach((k) => { newErrors[k] = validators[k](form[k]) })

        if (form.taskRegistrationLiveFrom && form.taskRegistrationDeadline &&
            form.taskRegistrationDeadline < form.taskRegistrationLiveFrom) {
            newErrors.taskRegistrationDeadline = 'Must be after Registration Live From'
        }
        if (form.taskRegistrationDeadline && form.taskSubmissionDeadline &&
            form.taskSubmissionDeadline < form.taskRegistrationDeadline) {
            newErrors.taskSubmissionDeadline = 'Must be after Registration Deadline'
        }
        if (form.taskSubmissionDeadline && form.taskResultDeadline &&
            form.taskResultDeadline < form.taskSubmissionDeadline) {
            newErrors.taskResultDeadline = 'Must be after Submission Deadline'
        }

        setErrors(newErrors)

        const rewardNo = Number(form.taskRewardNo)
        const rewardErr = !Number.isNaN(rewardNo) && rewardNo > 0
            ? validateRewardsArray(form.taskRewards, rewardNo)
            : ''
        setRewardArrayError(rewardErr)

        const docErr = taskDocFile ? validateTaskDocument(taskDocFile) : ''
        setTaskDocError(docErr)

        const fieldRefs = {
            taskTitle: taskTitleRef,
            taskDescription: taskDescRef,
            taskRewardNo: taskRewardNoRef,
        }
        for (const k of Object.keys(validators)) {
            if (newErrors[k]) {
                fieldRefs[k]?.current?.focus()
                return
            }
        }
        if (rewardErr) {
            firstRewardRef.current?.focus()
            return
        }
        if (docErr) return

        const fd = new FormData()
        fd.append('taskTitle', form.taskTitle.trim())
        fd.append('taskDescription', form.taskDescription.trim())
        fd.append('taskSubmissionDeadline',   form.taskSubmissionDeadline.toISOString())
        fd.append('taskRegistrationDeadline', form.taskRegistrationDeadline.toISOString())
        fd.append('taskRegistrationLiveFrom', form.taskRegistrationLiveFrom.toISOString())
        fd.append('taskRewardType', form.taskRewardType)
        fd.append('taskRewardNo', Number(form.taskRewardNo))
        fd.append('taskRewards',     JSON.stringify(form.taskRewards.map((r) => r.trim())))
        fd.append('taskTags',        JSON.stringify(form.taskTags))
        fd.append('taskConstraints', JSON.stringify(form.taskConstraints))
        fd.append('fileAcceptType',  JSON.stringify(form.fileAcceptType))
        fd.append('evaluators',      JSON.stringify(form.evaluators))
        fd.append('isLive', form.isLive)
        fd.append('acceptGithubLink', form.acceptGithubLink)
        fd.append('acceptLiveLink',   form.acceptLiveLink)
        fd.append('branchScope', form.branchScope || '')
        fd.append('orgScope',    form.orgScope)
        fd.append('taskResultDeadline', form.taskResultDeadline.toISOString())

        if (taskDocFile) fd.append('taskDocument', taskDocFile)

        try {
            setSubmitting(true)
            await axios.put(
                `${API}/api/edit-task/${id}`,
                fd,
                { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
            )
            topTost?.('success', 'Task updated successfully!')
        } catch (err) {
            console.error('Failed to update task:', err)
            const msg = err?.response?.data?.message || 'Failed to update task. Please try again.'
            topTost?.('error', typeof msg === 'string' ? msg : 'Failed to update task.')
        } finally {
            setSubmitting(false)
        }
    }

    // ─────────────────────────────────────────────
    // LOADING / ERROR / DATA
    // ─────────────────────────────────────────────
    if (loadingTaskData) {
        return (
            <div className="col-xxl-10 col-xl-11 col-12">
                <div className="card stretch stretch-full">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <RotatingLines visible height="40" width="40" color="blue" strokeWidth="5" animationDuration="0.75" />
                        <p className="text-muted mt-3 mb-0">Loading task data...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (fetchError) {
        return (
            <div className="col-xxl-10 col-xl-11 col-12">
                <div className="card stretch stretch-full">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <div className="mb-3 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 64, height: 64, background: '#fee2e2', color: '#dc2626' }}>
                            <FiAlertCircle size={28} />
                        </div>
                        <p className="text-danger mb-3">{fetchError}</p>
                        <button className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
                            onClick={() => window.location.reload()}>
                            <FiRefreshCw size={14} /> Retry
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const rewardCount = Number(form.taskRewardNo)
    const showRewardFields = !Number.isNaN(rewardCount) && rewardCount >= 1 && rewardCount <= 50
    const existingDocFilename = filenameFromUrl(existingDocUrl)
    const existingDocHref = existingDocUrl
        ? `${process.env.NEXT_PUBLIC_S3_BASE_URL || ''}${existingDocUrl}`
        : ''

    return (
        <div className="col-xxl-10 col-xl-11 col-12">
            <div className="card stretch stretch-full">

                <div className="card-header">
                    <h5 className="card-title mb-0">Edit Task</h5>
                    <p className="text-muted fs-12 mb-0 mt-1">
                        Update deadlines, rewards, evaluators, and other task details
                    </p>
                </div>

                <div className="card-body">

                    <SectionDivider icon={FiFileText} title="Basic Information" subtitle="Task identity and overview" />

                    <div className="row">
                        <div className="col-md-3">
                            <div className="mb-4">
                                <label className="form-label fw-semibold d-flex align-items-center justify-content-between">
                                    <span>Task No <span className="text-muted fs-11 ms-1">(read-only)</span></span>
                                </label>
                                <div className="position-relative">
                                    <FiHash size={15} className="text-muted position-absolute"
                                        style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                                    <input type="text" readOnly className="form-control ps-5"
                                        style={{ background: '#f3f4f6', cursor: 'not-allowed', fontWeight: 600 }}
                                        value={form.taskNo || '—'} />
                                </div>
                            </div>
                        </div>
                        <div className="col-md-9">
                            <InputRow label="Task Title" icon={FiFileText} fieldKey="taskTitle" inputRef={taskTitleRef}
                                placeholder="Enter task title" maxLength={200}
                                value={form.taskTitle} touched={touched.taskTitle} error={errors.taskTitle}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting} />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6 col-12">
                            <TextAreaRow label="Task Description" fieldKey="taskDescription" rows={5} maxLength={5000}
                                placeholder="Detailed description of what the task involves"
                                value={form.taskDescription} touched={touched.taskDescription} error={errors.taskDescription}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting} />
                        </div>

                        <div className="mb-4 col-md-6 col-12">
                            <label className="form-label fw-semibold">
                                Task Document <span className="text-muted fs-11 ms-1">(optional)</span>
                            </label>

                            {taskDocFile ? (
                                <div className="d-flex align-items-center gap-3 p-3 border rounded-3" style={{ background: '#f8faf8' }}>
                                    <div className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                        style={{ width: 40, height: 40, background: '#dcfce7' }}>
                                        <FiFile size={18} className="text-success" />
                                    </div>
                                    <div className="flex-grow-1 min-width-0">
                                        <div className="fs-13 fw-medium text-truncate">{taskDocFile.name}</div>
                                        <div className="fs-11 text-muted">
                                            {(taskDocFile.size / 1024).toFixed(1)} KB
                                            {existingDocUrl && <span className="ms-2 text-warning">· will replace existing</span>}
                                        </div>
                                    </div>
                                    <button className="btn btn-sm btn-outline-danger border-0 p-1"
                                        onClick={removeTaskDoc} disabled={submitting} title="Cancel replacement">
                                        <FiX size={16} />
                                    </button>
                                </div>
                            ) : existingDocUrl ? (
                                <div className="p-3 border rounded-3" style={{ background: '#fafafa' }}>
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <div className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                            style={{ width: 40, height: 40, background: '#eef2ff' }}>
                                            <FiFile size={18} className="text-primary" />
                                        </div>
                                        <div className="flex-grow-1 min-width-0">
                                            <div className="fs-13 fw-medium text-truncate">{existingDocFilename}</div>
                                            <div className="fs-11 text-muted">Current document on file</div>
                                        </div>
                                        <a href={existingDocHref} target="_blank" rel="noopener noreferrer"
                                            className="btn btn-sm btn-outline-secondary border-0 p-1" title="View">
                                            <FiDownload size={16} />
                                        </a>
                                    </div>
                                    <label htmlFor="task-doc-input"
                                        className="btn btn-sm btn-outline-primary w-100 d-inline-flex align-items-center justify-content-center gap-2 c-pointer"
                                        style={{ cursor: 'pointer' }}>
                                        <FiUpload size={14} /> Replace document
                                    </label>
                                    <input ref={taskDocInputRef} type="file" id="task-doc-input"
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"
                                        onChange={handleTaskDocChange} disabled={submitting} hidden />
                                </div>
                            ) : (
                                <label htmlFor="task-doc-input"
                                    className="d-flex flex-column align-items-center justify-content-center gap-2 p-4 border border-dashed rounded-3 c-pointer"
                                    style={{ background: '#fafafa', cursor: 'pointer', minHeight: 110 }}>
                                    <div className="d-flex align-items-center justify-content-center rounded-circle"
                                        style={{ width: 44, height: 44, background: '#eef2ff' }}>
                                        <FiUpload size={18} className="text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <span className="fs-13 fw-medium text-dark d-block">Upload task document</span>
                                        <span className="fs-11 text-muted">PDF, DOC, DOCX, PPT, PPTX, PNG, JPG, TXT — Max 10MB</span>
                                    </div>
                                    <input ref={taskDocInputRef} type="file" id="task-doc-input"
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"
                                        onChange={handleTaskDocChange} disabled={submitting} hidden />
                                </label>
                            )}
                            {taskDocError && <div className="invalid-feedback d-block">{taskDocError}</div>}
                        </div>
                    </div>

                    <hr className="my-4" />

                    <SectionDivider icon={FiCalendar} title="Deadlines & Schedule" subtitle="When the task opens, closes, and results come out" />

                    <div className="row">
                        <div className="col-md-6">
                            <DatePickerField label="Registration Live From" fieldKey="taskRegistrationLiveFrom"
                                value={form.taskRegistrationLiveFrom} touched={touched.taskRegistrationLiveFrom} error={errors.taskRegistrationLiveFrom}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting}
                                placeholder="When users can start registering" />
                        </div>
                        <div className="col-md-6">
                            <DatePickerField label="Registration Deadline" fieldKey="taskRegistrationDeadline"
                                value={form.taskRegistrationDeadline} touched={touched.taskRegistrationDeadline} error={errors.taskRegistrationDeadline}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting}
                                minDate={form.taskRegistrationLiveFrom}
                                placeholder="Last date to register" />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <DatePickerField label="Submission Deadline" fieldKey="taskSubmissionDeadline"
                                value={form.taskSubmissionDeadline} touched={touched.taskSubmissionDeadline} error={errors.taskSubmissionDeadline}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting}
                                minDate={form.taskRegistrationDeadline}
                                placeholder="Last date to submit work" />
                        </div>
                        <div className="col-md-6">
                            <DatePickerField label="Result Deadline" fieldKey="taskResultDeadline"
                                value={form.taskResultDeadline} touched={touched.taskResultDeadline} error={errors.taskResultDeadline}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting}
                                minDate={form.taskSubmissionDeadline}
                                placeholder="When results will be announced" />
                        </div>
                    </div>

                    <hr className="my-4" />

                    <SectionDivider icon={FiAward} title="Rewards" subtitle="What participants will earn" />

                    <div className="row">
                        <div className="col-md-6">
                            <DropdownField label="Reward Type"
                                options={REWARD_TYPE_OPTIONS} loading={false} loadingText=""
                                selectedValue={form.taskRewardType} touched={touched.taskRewardType} error={errors.taskRewardType}
                                fieldKey="taskRewardType" onSelect={handleDropdown} />
                        </div>
                        <div className="col-md-6">
                            <InputRow label="Number of Rewards" icon={FiHash} fieldKey="taskRewardNo" type="number" min="1" max="50" inputRef={taskRewardNoRef}
                                placeholder="e.g., 3 (top 3 winners)"
                                value={form.taskRewardNo} touched={touched.taskRewardNo} error={errors.taskRewardNo}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting} />
                        </div>
                    </div>

                    {showRewardFields && (
                        <div className="mb-4 p-3 rounded-3" style={{ background: '#fafafa', border: '1px solid #e5e7eb' }}>
                            <label className="form-label fw-semibold mb-3 d-block">
                                Reward Details <span className="text-danger">*</span>
                                <span className="text-muted fs-11 ms-2">Enter what each rank receives</span>
                            </label>
                            {form.taskRewards.map((rewardValue, idx) => (
                                <div key={idx} className="d-flex align-items-center gap-2 mb-2">
                                    <span className="badge bg-soft-primary text-primary fw-bold flex-shrink-0"
                                        style={{ width: 50, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        #{idx + 1}
                                    </span>
                                    <input
                                        ref={idx === 0 ? firstRewardRef : null}
                                        type="text"
                                        className={`form-control ${rewardArrayError && !rewardValue.trim() ? 'is-invalid' : ''}`}
                                        placeholder={
                                            idx === 0 ? 'e.g., ₹10,000 + Internship offer'
                                            : idx === 1 ? 'e.g., ₹5,000 + Certificate'
                                            : `Reward for rank #${idx + 1}`
                                        }
                                        value={rewardValue}
                                        onChange={(e) => handleRewardChange(idx, e.target.value)}
                                        disabled={submitting}
                                        maxLength={200}
                                    />
                                </div>
                            ))}
                            {rewardArrayError && (
                                <div className="text-danger fs-12 mt-1">{rewardArrayError}</div>
                            )}
                        </div>
                    )}

                    <hr className="my-4" />

                    <SectionDivider icon={FiTag} title="Tags & Constraints" subtitle="Categorize the task and set rules" />

                    <div className="row">
                        <div className="col-md-6 col-12">
                            <label className="form-label fw-semibold">
                                Task Tags <span className="text-danger">*</span>
                            </label>
                            {loadingTags ? (
                                <div className="d-flex align-items-center py-2">
                                    <RotatingLines visible height="22" width="22" color="blue" strokeWidth="5" animationDuration="0.75" />
                                    <span className="text-muted fs-13 ms-2">Loading tags...</span>
                                </div>
                            ) : (
                                <>
                                    <MultiSelectTags
                                        defaultSelect={defaultSelectedTags}
                                        options={tagOptions}
                                        placeholder="Select tags..."
                                        onChange={(selected) => handleMultiSelect('taskTags', selected)} />
                                    {touched.taskTags && errors.taskTags && (
                                        <div className="invalid-feedback d-block">{errors.taskTags}</div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="col-md-6 col-12">
                            <label className="form-label fw-semibold">
                                Task Constraints <span className="text-muted fs-11 ms-1">(optional)</span>
                            </label>
                            <div className="d-flex gap-2 mb-2">
                                <input type="text" className="form-control"
                                    placeholder="Type a constraint and press Enter"
                                    value={constraintInput}
                                    onChange={(e) => setConstraintInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addConstraint() } }}
                                    disabled={submitting} maxLength={200} />
                                <button type="button" className="btn btn-outline-primary"
                                    onClick={addConstraint} disabled={submitting || !constraintInput.trim()}>
                                    Add
                                </button>
                            </div>
                            {form.taskConstraints.length > 0 && (
                                <div className="d-flex flex-wrap gap-2">
                                    {form.taskConstraints.map((c, idx) => (
                                        <span key={idx} className="badge bg-soft-primary text-primary d-flex align-items-center gap-1 py-2 px-2 fs-12">
                                            {c}
                                            <button type="button" className="btn p-0 border-0 bg-transparent text-primary"
                                                style={{ lineHeight: 1 }} onClick={() => removeConstraint(idx)}>✕</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <hr className="my-4" />

                    <SectionDivider icon={FiSettings} title="Submission Settings" subtitle="What participants can upload or share" />

                    <div className="mb-4">
                        <label className="form-label fw-semibold">
                            Accepted File Types <span className="text-danger">*</span>
                        </label>
                        <MultiSelectTags
                            defaultSelect={defaultSelectedFiles}
                            options={FILE_TYPE_OPTIONS}
                            placeholder="Select file types..."
                            onChange={(selected) => handleMultiSelect('fileAcceptType', selected)} />
                        {touched.fileAcceptType && errors.fileAcceptType && (
                            <div className="invalid-feedback d-block">{errors.fileAcceptType}</div>
                        )}
                    </div>

                    <div className="row g-3">
                        <div className="col-md-6">
                            <SwitchField icon={FiGithub} label="Accept GitHub Link"
                                subtitle="Allow submission via GitHub repo URL"
                                checked={form.acceptGithubLink}
                                onChange={() => handleToggle('acceptGithubLink')} disabled={submitting} />
                        </div>
                        <div className="col-md-6">
                            <SwitchField icon={FiLink} label="Accept Live Link"
                                subtitle="Allow submission via deployed URL"
                                checked={form.acceptLiveLink}
                                onChange={() => handleToggle('acceptLiveLink')} disabled={submitting} />
                        </div>
                    </div>

                    <hr className="my-4" />

                    <SectionDivider icon={FiBriefcase} title="Scope" subtitle="Who can see and participate in this task" />

                    <div className="row">
                        <div className="col-md-6">
                            <DropdownField label="Organization Scope"
                                options={organizationOptions} loading={loadingDropdowns} loadingText="Loading..."
                                selectedValue={form.orgScope} touched={touched.orgScope} error={errors.orgScope}
                                fieldKey="orgScope" onSelect={handleDropdown} />
                        </div>
                        <div className="col-md-6">
                            <DropdownField label="Branch Scope"
                                options={branchOptions} loading={loadingDropdowns} loadingText="Loading..."
                                selectedValue={form.branchScope} touched={touched.branchScope} error={errors.branchScope}
                                fieldKey="branchScope" onSelect={handleDropdown}
                                hint="Select an organization first"
                                required={false} />
                        </div>
                    </div>

                    <hr className="my-4" />

                    <SectionDivider icon={FiUsers} title="Evaluation & Access" subtitle="Who evaluates and how to enter" />

                    <div className="row">
                        <div className="col-md-6 col-12">
                            <div className="mb-4">
                                <label className="form-label fw-semibold">
                                    Evaluators <span className="text-danger">*</span>
                                    {!form.orgScope && (
                                        <span className="text-muted fs-11 ms-2">(select organization first)</span>
                                    )}
                                </label>
                                {!form.orgScope ? (
                                    <div className="d-flex align-items-center gap-2 p-3 rounded-3 fs-12 text-muted"
                                        style={{ background: '#f9fafb', border: '1px dashed #e5e7eb' }}>
                                        <FiInfo size={14} />
                                        <span>Pick an organization in the Scope section to load its evaluators.</span>
                                    </div>
                                ) : loadingEvaluators ? (
                                    <div className="d-flex align-items-center py-2">
                                        <RotatingLines visible height="22" width="22" color="blue" strokeWidth="5" animationDuration="0.75" />
                                        <span className="text-muted fs-13 ms-2">Loading evaluators for this organization...</span>
                                    </div>
                                ) : evaluatorOptions.length === 0 ? (
                                    <div className="d-flex align-items-center gap-2 p-3 rounded-3 fs-12 text-warning"
                                        style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                                        <FiInfo size={14} />
                                        <span>No evaluators found for the selected organization.</span>
                                    </div>
                                ) : (
                                    <>
                                        <MultiSelectTags
                                            key={form.orgScope}
                                            defaultSelect={defaultSelectedEvals}
                                            options={evaluatorOptions}
                                            placeholder="Select evaluators..."
                                            onChange={(selected) => handleMultiSelect('evaluators', selected)}
                                        />
                                        {touched.evaluators && errors.evaluators && (
                                            <div className="invalid-feedback d-block">{errors.evaluators}</div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6 col-12">
                            <div className="mb-4">
                                <label className="form-label fw-semibold d-flex align-items-center justify-content-between">
                                    <span>Pass Key <span className="text-muted fs-11 ms-1">(read-only)</span></span>
                                </label>
                                <div className="position-relative">
                                    <FiKey size={15} className="text-muted position-absolute"
                                        style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                                    <input type="text" readOnly className="form-control ps-5"
                                        style={{ background: '#f3f4f6', cursor: 'not-allowed', fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }}
                                        value={form.passKey || '—'} />
                                </div>
                                <div className="text-muted fs-11 mt-1">Pass key cannot be changed after task creation.</div>
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6 col-12 d-flex align-items-start">
                            <div className="w-100">
                                <SwitchField icon={FiToggleLeft} label="Make Task Live"
                                    subtitle="Visible to participants right away"
                                    checked={form.isLive}
                                    onChange={() => handleToggle('isLive')} disabled={submitting} />
                            </div>
                        </div>
                        <div className="col-md-6 col-12 d-flex align-items-start gap-2 p-3 rounded-3" style={{ background: '#eff6ff' }}>
                            <FiInfo size={16} className="text-primary flex-shrink-0 mt-1" />
                            <div className="fs-12 text-muted">
                                Updating the task will apply changes immediately. Participants who already registered will keep their registration. The <strong>Task No</strong> and <strong>Pass Key</strong> cannot be changed.
                            </div>
                        </div>
                    </div>

                </div>

                <div className="card-footer d-flex align-items-center justify-content-between bg-transparent">
                    <span className="fs-11 text-muted">
                        <span className="text-danger">*</span> indicates required fields
                    </span>
                    <button className="btn btn-primary d-flex align-items-center"
                        onClick={handleSubmit} disabled={submitting}>
                        {submitting ? (
                            <RotatingLines visible height="20" width="20" color="white" strokeWidth="5" animationDuration="0.75" />
                        ) : (
                            <>
                                <FiSave size={16} className="me-2" />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    )
}

export default EditTask