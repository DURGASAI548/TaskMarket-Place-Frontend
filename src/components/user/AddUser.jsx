'use client'
import React, { useState, useEffect, useRef } from 'react'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'
import SelectDropdown from '@/components/shared/SelectDropdown'
import { FiCamera, FiSave, FiUpload, FiX, FiUser, FiTag, FiMail, FiPhone, FiFile, FiUsers, FiInfo, FiDownload, FiAlertCircle } from 'react-icons/fi'

// ── Validation Rules ──────────────────────────────────────

const validateName = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Name is required'
    if (trimmed.length < 2) return 'Name must be at least 2 characters'
    if (trimmed.length > 100) return 'Name must be under 100 characters'
    if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return 'Name contains invalid characters'
    return ''
}

const validateRollNumber = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Roll number is required'
    if (trimmed.length < 1) return 'Roll number is too short'
    if (trimmed.length > 30) return 'Roll number must be under 30 characters'
    if (!/^[a-zA-Z0-9-/]+$/.test(trimmed)) return 'Roll number can only contain letters, numbers, hyphens, and slashes'
    return ''
}

const validateEmail = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address'
    if (trimmed.length > 254) return 'Email must be under 254 characters'
    return ''
}

const validateUsername = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Display name is required'
    if (trimmed.length < 3) return 'Display name must be at least 3 characters'
    if (trimmed.length > 50) return 'Display name must be under 50 characters'
    if (!/^[a-zA-Z0-9\s._-]+$/.test(trimmed)) return 'Display name contains invalid characters'
    return ''
}

const validatePhone = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Phone number is required'
    if (!/^[+]?[0-9\s-]{7,15}$/.test(trimmed)) return 'Enter a valid phone number'
    return ''
}

const validateOrganization = (value) => {
    if (!value) return 'Please select an organization'
    return ''
}

const validateBranch = (value) => {
    if (!value) return 'Please select a branch'
    return ''
}

const validateAvatar = (file) => {
    if (!file) return ''
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg']
    if (!allowedTypes.includes(file.type)) return 'Only PNG, JPG, JPEG files are allowed'
    if (file.size > 2 * 1024 * 1024) return 'File size must be under 2MB'
    return ''
}

// ── CSV-only validation ───────────────────────────────────
const validateCsvFile = (file) => {
    if (!file) return 'Please upload a CSV file'

    // Check extension (most reliable since MIME types vary across browsers/OS)
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (ext !== '.csv') {
        return 'Only CSV files are allowed (.csv)'
    }

    // Validate MIME type when available
    const allowedMimeTypes = [
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel', // Excel sometimes reports CSV as this
        'text/plain', // Some systems report CSV as plain text
        '', // Some browsers don't set MIME for CSV
    ]
    if (file.type && !allowedMimeTypes.includes(file.type)) {
        return 'Invalid file type. Please upload a .csv file'
    }

    if (file.size > 10 * 1024 * 1024) return 'File size must be under 10MB'
    if (file.size === 0) return 'File is empty'
    return ''
}

// ── CSV Template Data ─────────────────────────────────────
const CSV_TEMPLATE_HEADERS = ['name', 'email', 'displayName', 'rollNo', 'phoneNo']
const CSV_SAMPLE_ROWS = [
    ['John Doe', 'john.doe@example.com', 'John', '21A91A0501', '9876543210'],
    ['Jane Smith', 'jane.smith@example.com', 'Jane', '21A91A0502', '9876543211'],
    ['Ravi Kumar', 'ravi.kumar@example.com', 'Ravi', '21A91A0503', '9876543212'],
]

// Escape CSV field if it contains commas, quotes, or newlines
const escapeCsvField = (field) => {
    const str = String(field)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

const generateCsvTemplate = () => {
    const headerRow = CSV_TEMPLATE_HEADERS.map(escapeCsvField).join(',')
    const dataRows = CSV_SAMPLE_ROWS.map((row) =>
        row.map(escapeCsvField).join(',')
    )
    return [headerRow, ...dataRows].join('\n')
}

const downloadCsvTemplate = () => {
    const csvContent = generateCsvTemplate()
    // Add BOM so Excel opens UTF-8 CSVs correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'users-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

const singleValidators = {
    name: validateName,
    rollNumber: validateRollNumber,
    email: validateEmail,
    organization: validateOrganization,
    branch: validateBranch,
    username: validateUsername,
    phone: validatePhone,
}

const bulkValidators = {
    organization: validateOrganization,
    branch: validateBranch,
}

const initialSingleForm = {
    name: '',
    rollNumber: '',
    email: '',
    organization: null,
    branch: null,
    username: '',
    phone: '',
}

const initialBulkForm = {
    organization: null,
    branch: null,
}

const createTouchedState = (keys) =>
    keys.reduce((acc, key) => ({ ...acc, [key]: false }), {})

const createErrorState = (keys) =>
    keys.reduce((acc, key) => ({ ...acc, [key]: '' }), {})

const singleKeys = Object.keys(initialSingleForm)
const bulkKeys = Object.keys(initialBulkForm)

// ── Reusable Components (outside to prevent remounting) ───

const InputRow = ({ label, icon: Icon, fieldKey, type = 'text', inputRef, placeholder, maxLength, value, touched, error, onChange, onBlur, disabled }) => (
    <div className="mb-4">
        <label className="form-label fw-semibold">
            {label} <span className="text-danger">*</span>
        </label>
        <div className="position-relative">
            {Icon && (
                <Icon
                    size={15}
                    className="text-muted position-absolute"
                    style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
                />
            )}
            <input
                ref={inputRef}
                type={type}
                className={`form-control ${Icon ? 'ps-5' : ''} ${touched ? (error ? 'is-invalid' : 'is-valid') : ''}`}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                onBlur={() => onBlur(fieldKey)}
                disabled={disabled}
                maxLength={maxLength}
            />
        </div>
        {touched && error && (
            <div className="invalid-feedback d-block">{error}</div>
        )}
    </div>
)

const DropdownField = ({ label, options, loading, loadingText, selectedValue, touched, error, fieldKey, onSelect, hint }) => (
    <div className="mb-4">
        <label className="form-label fw-semibold">
            {label} <span className="text-danger">*</span>
        </label>
        {loading ? (
            <div className="d-flex align-items-center py-2">
                <RotatingLines visible height="22" width="22" color="blue" strokeWidth="5" animationDuration="0.75" />
                <span className="text-muted fs-13 ms-2">{loadingText}</span>
            </div>
        ) : (
            <>
                <SelectDropdown
                    options={options}
                    selectedOption={options.find((opt) => opt.value === selectedValue) || null}
                    defaultSelect=""
                    onSelectOption={(option) => onSelect(fieldKey, option)}
                />
                {hint && !error && options.length === 0 && (
                    <div className="text-muted fs-11 mt-1">{hint}</div>
                )}
                {touched && error && (
                    <div className="invalid-feedback d-block">{error}</div>
                )}
            </>
        )}
    </div>
)

const SectionDivider = ({ icon: Icon, title, subtitle }) => (
    <div className="d-flex align-items-center mb-4 mt-2">
        <div
            className="d-flex align-items-center justify-content-center rounded-2 me-3 flex-shrink-0"
            style={{ width: 36, height: 36, background: '#eef2ff' }}
        >
            <Icon size={16} className="text-primary" />
        </div>
        <div>
            <h6 className="fw-bold mb-0 fs-13">{title}</h6>
            {subtitle && <p className="text-muted fs-11 mb-0">{subtitle}</p>}
        </div>
    </div>
)

const AddUsers = () => {
    const [isBulkUpload, setIsBulkUpload] = useState(false)

    const [singleForm, setSingleForm] = useState({ ...initialSingleForm })
    const [singleErrors, setSingleErrors] = useState(createErrorState(singleKeys))
    const [singleTouched, setSingleTouched] = useState(createTouchedState(singleKeys))

    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState('/images/avatar/1.png')
    const [avatarError, setAvatarError] = useState('')

    const [bulkForm, setBulkForm] = useState({ ...initialBulkForm })
    const [bulkErrors, setBulkErrors] = useState(createErrorState(bulkKeys))
    const [bulkTouched, setBulkTouched] = useState(createTouchedState(bulkKeys))

    const [csvFile, setCsvFile] = useState(null)
    const [csvError, setCsvError] = useState('')

    const [bulkResult, setBulkResult] = useState(null)

    const [orgWithBranches, setOrgWithBranches] = useState([])
    const [organizationOptions, setOrganizationOptions] = useState([])
    const [branchOptions, setBranchOptions] = useState([])
    const [loadingDropdowns, setLoadingDropdowns] = useState(true)

    const [submitting, setSubmitting] = useState(false)

    const nameRef = useRef(null)
    const rollRef = useRef(null)
    const emailRef = useRef(null)
    const usernameRef = useRef(null)
    const phoneRef = useRef(null)
    const avatarInputRef = useRef(null)
    const csvInputRef = useRef(null)

    useEffect(() => {
        const fetchOrgWithBranches = async () => {
            try {
                setLoadingDropdowns(true)
                const result = await axios.get(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/get-org-with-branches`,
                    { withCredentials: true }
                )
                const data = result.data.data
                setOrgWithBranches(data)
                const orgOpts = data.map((org) => ({
                    value: org.organizationId,
                    label: org.organizationName,
                    img: '',
                }))
                setOrganizationOptions(orgOpts)
            } catch (err) {
                console.error('Failed to fetch org/branch data:', err)
                topTost?.('error', 'Failed to load organizations and branches.')
            } finally {
                setLoadingDropdowns(false)
            }
        }
        fetchOrgWithBranches()
    }, [])

    const currentOrgId = isBulkUpload ? bulkForm.organization : singleForm.organization

    useEffect(() => {
        if (currentOrgId) {
            const selectedOrg = orgWithBranches.find((org) => org.organizationId === currentOrgId)
            const branches = (selectedOrg?.branchesEligible || []).map((b) => ({
                value: b.branchId,
                label: b.branchName,
                img: '',
            }))
            setBranchOptions(branches)
        } else {
            setBranchOptions([])
        }

        if (isBulkUpload) {
            setBulkForm((prev) => ({ ...prev, branch: null }))
        } else {
            setSingleForm((prev) => ({ ...prev, branch: null }))
        }
    }, [currentOrgId, orgWithBranches])

    // ── Single Form Handlers ──────────────────────────────
    const handleSingleChange = (field, value) => {
        setSingleForm((prev) => ({ ...prev, [field]: value }))
        if (singleTouched[field]) {
            setSingleErrors((prev) => ({ ...prev, [field]: singleValidators[field](value) }))
        }
    }

    const handleSingleBlur = (field) => {
        setSingleTouched((prev) => ({ ...prev, [field]: true }))
        setSingleErrors((prev) => ({ ...prev, [field]: singleValidators[field](singleForm[field]) }))
    }

    const handleSingleDropdown = (field, option) => {
        const val = option?.value || null
        handleSingleChange(field, val)
        setSingleTouched((prev) => ({ ...prev, [field]: true }))
        setSingleErrors((prev) => ({ ...prev, [field]: singleValidators[field](val) }))
    }

    // ── Bulk Form Handlers ────────────────────────────────
    const handleBulkDropdown = (field, option) => {
        const val = option?.value || null
        setBulkForm((prev) => ({ ...prev, [field]: val }))
        setBulkTouched((prev) => ({ ...prev, [field]: true }))
        setBulkErrors((prev) => ({ ...prev, [field]: bulkValidators[field](val) }))
    }

    // ── Avatar Handler ────────────────────────────────────
    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const error = validateAvatar(file)
        setAvatarError(error)
        if (!error) {
            setAvatarFile(file)
            setAvatarPreview(URL.createObjectURL(file))
        } else {
            e.target.value = ''
        }
    }

    const removeAvatar = () => {
        setAvatarFile(null)
        setAvatarPreview('/images/avatar/1.png')
        setAvatarError('')
        if (avatarInputRef.current) avatarInputRef.current.value = ''
    }

    // ── CSV File Handler ──────────────────────────────────
    const handleCsvChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const error = validateCsvFile(file)
        setCsvError(error)
        if (!error) {
            setCsvFile(file)
        } else {
            e.target.value = ''
        }
    }

    const removeCsvFile = () => {
        setCsvFile(null)
        setCsvError('')
        if (csvInputRef.current) csvInputRef.current.value = ''
    }

    // ── Submit: Single User ───────────────────────────────
    const handleSingleSubmit = async () => {
        const allTouched = singleKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
        setSingleTouched(allTouched)

        const newErrors = {}
        singleKeys.forEach((key) => {
            newErrors[key] = singleValidators[key](singleForm[key])
        })
        setSingleErrors(newErrors)

        const avatarErr = avatarFile ? validateAvatar(avatarFile) : ''
        setAvatarError(avatarErr)

        const fieldRefs = {
            name: nameRef,
            rollNumber: rollRef,
            email: emailRef,
            username: usernameRef,
            phone: phoneRef,
        }
        for (const key of singleKeys) {
            if (newErrors[key]) {
                fieldRefs[key]?.current?.focus()
                return
            }
        }
        if (avatarErr) return

        const formData = new FormData()
        formData.append('name', singleForm.name.trim())
        formData.append('email', singleForm.email.trim())
        formData.append('displayName', singleForm.username.trim())
        formData.append('rollNo', singleForm.rollNumber.trim())
        formData.append('phoneNo', singleForm.phone.trim())
        formData.append('org', singleForm.organization)
        formData.append('branch', singleForm.branch)
        if (avatarFile) formData.append('profile', avatarFile)

        try {
            setSubmitting(true)
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/add-user`,
                formData,
                { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
            )
            topTost?.('success', 'User added successfully!')
            setSingleForm({ ...initialSingleForm })
            setSingleTouched(createTouchedState(singleKeys))
            setSingleErrors(createErrorState(singleKeys))
            removeAvatar()
        } catch (err) {
            console.error('Failed to add user:', err)
            const message = err?.response?.data?.message || 'Failed to add user. Please try again.'
            topTost?.('error', message)
        } finally {
            setSubmitting(false)
        }
    }

    // ── Submit: Bulk Upload ───────────────────────────────
    const handleBulkSubmit = async () => {
        const allTouched = bulkKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
        setBulkTouched(allTouched)

        const newErrors = {}
        bulkKeys.forEach((key) => {
            newErrors[key] = bulkValidators[key](bulkForm[key])
        })
        setBulkErrors(newErrors)

        const fileErr = validateCsvFile(csvFile)
        setCsvError(fileErr)

        if (Object.values(newErrors).some((e) => e) || fileErr) return

        // Clear any previous result before new submission
        setBulkResult(null)

        const formData = new FormData()
        formData.append('org', bulkForm.organization)
        formData.append('branch', bulkForm.branch)
        formData.append('file', csvFile)

        try {
            setSubmitting(true)
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/add-users-bulk-upload`,
                formData,
                { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
            )

            const { stats, failedData } = response.data || {}

            setBulkResult({
                stats: stats || { total: 0, uploaded: 0, failed: 0 },
                failedData: failedData || [],
            })

            if (stats?.failed > 0 && stats?.uploaded > 0) {
                topTost?.('warning', `Partial success: ${stats.uploaded} uploaded, ${stats.failed} failed`)
            } else if (stats?.failed > 0 && stats?.uploaded === 0) {
                topTost?.('error', `All ${stats.failed} rows failed to upload`)
            } else {
                topTost?.('success', `Successfully uploaded ${stats?.uploaded || 0} users!`)
            }

            // Reset form fields only if fully successful
            if (stats?.failed === 0) {
                setBulkForm({ ...initialBulkForm })
                setBulkTouched(createTouchedState(bulkKeys))
                setBulkErrors(createErrorState(bulkKeys))
                removeCsvFile()
            }
        } catch (err) {
            console.error('Failed to upload users:', err)
            const message = err?.response?.data?.message || 'Failed to upload users. Please try again.'
            topTost?.('error', message)
            setBulkResult(null)
        } finally {
            setSubmitting(false)
        }
    }

    // ── Clear result banner ────────────────────────────────
    const dismissBulkResult = () => {
        setBulkResult(null)
    }

    return (
        <div className="col-xxl-8 col-xl-9 col-lg-10 col-12">
            <div className="card stretch stretch-full">

                {/* ── Card Header ────────────────────────────── */}
                <div className="card-header d-flex align-items-center justify-content-between">
                    <div>
                        <h5 className="card-title mb-0">
                            {isBulkUpload ? 'Bulk Upload Users' : 'Add New User'}
                        </h5>
                        <p className="text-muted fs-12 mb-0 mt-1">
                            {isBulkUpload
                                ? 'Upload multiple users at once using a CSV file'
                                : 'Fill in the details below to create a new user account'}
                        </p>
                    </div>
                    <div className="form-check form-switch form-switch-sm mb-0">
                        <input
                            className="form-check-input c-pointer"
                            type="checkbox"
                            id="bulkToggle"
                            checked={isBulkUpload}
                            onChange={() => {
                                setIsBulkUpload(!isBulkUpload)
                                setBulkResult(null) // clear previous results on mode switch
                            }}
                            disabled={submitting}
                        />
                        <label className="form-check-label fw-500 text-dark c-pointer fs-12" htmlFor="bulkToggle">
                            Bulk Upload
                        </label>
                    </div>
                </div>

                {/* ── Card Body ───────────────────────────────── */}
                <div className="card-body">

                    {isBulkUpload ? (
                        /* ══════════════════════════════════════════
                           BULK UPLOAD MODE
                           ══════════════════════════════════════════ */
                        <>
                            {/* ─── Bulk Upload Result (Stats) ────── */}
                            {bulkResult && (
                                <div className="mb-4">
                                    {/* Stats summary card */}
                                    <div
                                        className="d-flex align-items-center gap-3 p-3 rounded-3 mb-3"
                                        style={{
                                            background: bulkResult.stats.failed > 0 && bulkResult.stats.uploaded === 0 ? '#fee2e2'
                                                : bulkResult.stats.failed > 0 ? '#fef3c7'
                                                    : '#dcfce7',
                                            border: `1px solid ${
                                                bulkResult.stats.failed > 0 && bulkResult.stats.uploaded === 0 ? '#fecaca'
                                                : bulkResult.stats.failed > 0 ? '#fde68a'
                                                    : '#bbf7d0'
                                            }`,
                                        }}
                                    >
                                        <div className="flex-grow-1">
                                            <div className="fs-13 fw-bold mb-2">
                                                {bulkResult.stats.failed === 0 ? '✓ Upload Complete'
                                                    : bulkResult.stats.uploaded === 0 ? '✕ Upload Failed'
                                                        : '⚠ Partial Upload'}
                                            </div>
                                            <div className="d-flex gap-4 flex-wrap">
                                                <div>
                                                    <span className="fs-11 text-muted d-block">Total Rows</span>
                                                    <span className="fs-15 fw-bold">{bulkResult.stats.total}</span>
                                                </div>
                                                <div>
                                                    <span className="fs-11 text-muted d-block">Uploaded</span>
                                                    <span className="fs-15 fw-bold text-success">{bulkResult.stats.uploaded}</span>
                                                </div>
                                                <div>
                                                    <span className="fs-11 text-muted d-block">Failed</span>
                                                    <span className="fs-15 fw-bold text-danger">{bulkResult.stats.failed}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-icon border-0 p-1 flex-shrink-0"
                                            onClick={dismissBulkResult}
                                            title="Dismiss"
                                        >
                                            <FiX size={16} className="text-muted" />
                                        </button>
                                    </div>

                                    {/* Failed rows details */}
                                    {bulkResult.failedData && bulkResult.failedData.length > 0 && (
                                        <div className="border rounded-3 overflow-hidden">
                                            <div className="d-flex align-items-center gap-2 px-3 py-2" style={{ background: '#fef2f2' }}>
                                                <FiAlertCircle size={14} className="text-danger" />
                                                <span className="fs-12 fw-semibold text-danger">
                                                    Failed Rows ({bulkResult.failedData.length})
                                                </span>
                                            </div>
                                            <div className="table-responsive" style={{ maxHeight: 240 }}>
                                                <table className="table table-sm mb-0" style={{ fontSize: '0.8rem' }}>
                                                    <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                                                        <tr>
                                                            <th style={{ width: 40 }}>#</th>
                                                            <th>Name</th>
                                                            <th>Email</th>
                                                            <th>Reason</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {bulkResult.failedData.map((item, i) => (
                                                            <tr key={i}>
                                                                <td className="text-muted">{i + 1}</td>
                                                                <td>{item.row?.name || '—'}</td>
                                                                <td className="text-muted">{item.row?.email || '—'}</td>
                                                                <td>
                                                                    <span className="badge bg-soft-danger text-danger">
                                                                        {item.reason || 'Unknown error'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ─── Download Template Banner ─────── */}
                            <div
                                className="d-flex align-items-center gap-3 p-3 rounded-3 mb-4"
                                style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
                            >
                                <div
                                    className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                    style={{ width: 40, height: 40, background: '#fbbf24' }}
                                >
                                    <FiDownload size={18} className="text-white" />
                                </div>
                                <div className="flex-grow-1">
                                    <div className="fs-13 fw-bold mb-1">New to bulk upload?</div>
                                    <div className="fs-12 text-muted">
                                        Download our sample CSV template to see the exact format required.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-warning d-flex align-items-center flex-shrink-0"
                                    onClick={downloadCsvTemplate}
                                >
                                    <FiDownload size={14} className="me-2" />
                                    <span>Download Template</span>
                                </button>
                            </div>

                            {/* Section: Assignment */}
                            <SectionDivider
                                icon={FiUsers}
                                title="Assignment"
                                subtitle="Select which organization and branch these users belong to"
                            />

                            <div className="row">
                                <div className="col-md-6">
                                    <DropdownField
                                        label="Organization"
                                        options={organizationOptions}
                                        loading={loadingDropdowns}
                                        loadingText="Loading data..."
                                        selectedValue={bulkForm.organization}
                                        touched={bulkTouched.organization}
                                        error={bulkErrors.organization}
                                        fieldKey="organization"
                                        onSelect={handleBulkDropdown}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <DropdownField
                                        label="Branch"
                                        options={branchOptions}
                                        loading={loadingDropdowns}
                                        loadingText="Loading data..."
                                        selectedValue={bulkForm.branch}
                                        touched={bulkTouched.branch}
                                        error={bulkErrors.branch}
                                        fieldKey="branch"
                                        hint="Select an organization first to see available branches"
                                        onSelect={handleBulkDropdown}
                                    />
                                </div>
                            </div>

                            <hr className="my-4" />

                            {/* Section: File Upload */}
                            <SectionDivider
                                icon={FiUpload}
                                title="Upload CSV File"
                                subtitle="Upload a CSV file with user data (follows the template format)"
                            />

                            <div className="mb-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <label className="form-label fw-semibold mb-0">
                                        Users CSV File <span className="text-danger">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center"
                                        onClick={downloadCsvTemplate}
                                    >
                                        <FiDownload size={12} className="me-1" />
                                        <span className="fs-12">Download sample</span>
                                    </button>
                                </div>
                                {csvFile ? (
                                    <div className="d-flex align-items-center gap-3 p-3 border rounded-3" style={{ background: '#f8faf8' }}>
                                        <div
                                            className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                            style={{ width: 40, height: 40, background: '#dcfce7' }}
                                        >
                                            <FiFile size={18} className="text-success" />
                                        </div>
                                        <div className="flex-grow-1 min-width-0">
                                            <div className="fs-13 fw-medium text-truncate">{csvFile.name}</div>
                                            <div className="fs-11 text-muted">{(csvFile.size / 1024).toFixed(1)} KB</div>
                                        </div>
                                        <button
                                            className="btn btn-sm btn-outline-danger border-0 p-1"
                                            onClick={removeCsvFile}
                                            disabled={submitting}
                                            title="Remove file"
                                        >
                                            <FiX size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label
                                        htmlFor="csv-file"
                                        className="d-flex flex-column align-items-center justify-content-center gap-2 p-4 border border-dashed rounded-3 c-pointer"
                                        style={{ background: '#fafafa', cursor: 'pointer', minHeight: 120 }}
                                    >
                                        <div
                                            className="d-flex align-items-center justify-content-center rounded-circle"
                                            style={{ width: 48, height: 48, background: '#eef2ff' }}
                                        >
                                            <FiUpload size={20} className="text-primary" />
                                        </div>
                                        <div className="text-center">
                                            <span className="fs-13 fw-medium text-dark d-block">Click to upload CSV</span>
                                            <span className="fs-11 text-muted">Only .csv files — Max 10MB</span>
                                        </div>
                                        <input
                                            ref={csvInputRef}
                                            type="file"
                                            id="csv-file"
                                            accept=".csv,text/csv"
                                            onChange={handleCsvChange}
                                            disabled={submitting}
                                            hidden
                                        />
                                    </label>
                                )}
                                {csvError && (
                                    <div className="invalid-feedback d-block">{csvError}</div>
                                )}
                            </div>

                            {/* Info box */}
                            <div className="d-flex align-items-start gap-2 p-3 rounded-3 mb-4" style={{ background: '#eff6ff' }}>
                                <FiInfo size={16} className="text-primary flex-shrink-0 mt-1" />
                                <div className="fs-12 text-muted">
                                    Your CSV file must contain these columns in order: <strong>name</strong>, <strong>email</strong>, <strong>displayName</strong>, <strong>rollNo</strong>, <strong>phoneNo</strong>. Each row will be created as a new user in the selected organization and branch. <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none fs-12" onClick={downloadCsvTemplate}>Download the template</button> to make sure your file matches exactly.
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ══════════════════════════════════════════
                           SINGLE USER MODE
                           ══════════════════════════════════════════ */
                        <>
                            {/* Section: Profile Photo */}
                            <SectionDivider
                                icon={FiCamera}
                                title="Profile Photo"
                                subtitle="Upload a profile picture for the user (optional)"
                            />

                            <div className="mb-4">
                                <div className="d-flex gap-4 align-items-start">
                                    <div className="position-relative flex-shrink-0">
                                        <label
                                            htmlFor="avatar-input"
                                            className="wd-100 ht-100 position-relative overflow-hidden border border-gray-2 rounded d-block"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <img
                                                src={avatarPreview}
                                                className="img-fluid rounded h-100 w-100"
                                                alt="Avatar"
                                                style={{ objectFit: 'cover' }}
                                            />
                                            <div className="position-absolute start-50 top-50 translate-middle h-100 w-100 hstack align-items-center justify-content-center upload-button">
                                                <FiCamera className="camera-icon" />
                                            </div>
                                            <input
                                                ref={avatarInputRef}
                                                className="file-upload"
                                                type="file"
                                                accept="image/png,image/jpg,image/jpeg"
                                                id="avatar-input"
                                                onChange={handleAvatarChange}
                                                disabled={submitting}
                                                hidden
                                            />
                                        </label>
                                        {avatarFile && (
                                            <button
                                                className="btn btn-sm btn-danger position-absolute rounded-circle p-0 d-flex align-items-center justify-content-center"
                                                style={{ width: 22, height: 22, top: -8, right: -8, zIndex: 2 }}
                                                onClick={removeAvatar}
                                                title="Remove avatar"
                                            >
                                                <FiX size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="d-flex flex-column gap-1 pt-2">
                                        <span className="fs-12 text-muted">Upload a profile photo</span>
                                        <span className="fs-11 text-muted">Max size: 2MB</span>
                                        <span className="fs-11 text-muted">Formats: PNG, JPG, JPEG</span>
                                    </div>
                                </div>
                                {avatarError && (
                                    <div className="invalid-feedback d-block mt-2">{avatarError}</div>
                                )}
                            </div>

                            <hr className="my-4" />

                            {/* Section: Personal Information */}
                            <SectionDivider
                                icon={FiUser}
                                title="Personal Information"
                                subtitle="Basic details about the user"
                            />

                            <div className="row">
                                <div className="col-md-6">
                                    <InputRow
                                        label="Full Name" icon={FiUser} fieldKey="name" inputRef={nameRef}
                                        placeholder="Enter full name" maxLength={100}
                                        value={singleForm.name} touched={singleTouched.name} error={singleErrors.name}
                                        onChange={handleSingleChange} onBlur={handleSingleBlur} disabled={submitting}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputRow
                                        label="Roll Number" icon={FiTag} fieldKey="rollNumber" inputRef={rollRef}
                                        placeholder="Enter roll number" maxLength={30}
                                        value={singleForm.rollNumber} touched={singleTouched.rollNumber} error={singleErrors.rollNumber}
                                        onChange={handleSingleChange} onBlur={handleSingleBlur} disabled={submitting}
                                    />
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-6">
                                    <InputRow
                                        label="Email Address" icon={FiMail} fieldKey="email" type="email" inputRef={emailRef}
                                        placeholder="Enter email address" maxLength={254}
                                        value={singleForm.email} touched={singleTouched.email} error={singleErrors.email}
                                        onChange={handleSingleChange} onBlur={handleSingleBlur} disabled={submitting}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputRow
                                        label="Phone Number" icon={FiPhone} fieldKey="phone" type="tel" inputRef={phoneRef}
                                        placeholder="Enter phone number" maxLength={15}
                                        value={singleForm.phone} touched={singleTouched.phone} error={singleErrors.phone}
                                        onChange={handleSingleChange} onBlur={handleSingleBlur} disabled={submitting}
                                    />
                                </div>
                            </div>

                            <hr className="my-4" />

                            {/* Section: Organization & Branch */}
                            <SectionDivider
                                icon={FiUsers}
                                title="Organization & Branch"
                                subtitle="Assign the user to an organization and branch"
                            />

                            <div className="row">
                                <div className="col-md-6">
                                    <DropdownField
                                        label="Organization"
                                        options={organizationOptions}
                                        loading={loadingDropdowns}
                                        loadingText="Loading data..."
                                        selectedValue={singleForm.organization}
                                        touched={singleTouched.organization}
                                        error={singleErrors.organization}
                                        fieldKey="organization"
                                        onSelect={handleSingleDropdown}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <DropdownField
                                        label="Branch"
                                        options={branchOptions}
                                        loading={loadingDropdowns}
                                        loadingText="Loading data..."
                                        selectedValue={singleForm.branch}
                                        touched={singleTouched.branch}
                                        error={singleErrors.branch}
                                        fieldKey="branch"
                                        hint="Select an organization first to see available branches"
                                        onSelect={handleSingleDropdown}
                                    />
                                </div>
                            </div>

                            <hr className="my-4" />

                            {/* Section: Account Details */}
                            <SectionDivider
                                icon={FiTag}
                                title="Account Details"
                                subtitle="Display name for the user's profile"
                            />

                            <div className="row">
                                <div className="col-md-6">
                                    <InputRow
                                        label="Display Name" icon={FiUser} fieldKey="username" inputRef={usernameRef}
                                        placeholder="Enter display name" maxLength={50}
                                        value={singleForm.username} touched={singleTouched.username} error={singleErrors.username}
                                        onChange={handleSingleChange} onBlur={handleSingleBlur} disabled={submitting}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Card Footer ────────────────────────────── */}
                <div className="card-footer d-flex align-items-center justify-content-between bg-transparent">
                    <span className="fs-11 text-muted">
                        <span className="text-danger">*</span> indicates required fields
                    </span>
                    <button
                        className="btn btn-primary d-flex align-items-center"
                        onClick={isBulkUpload ? handleBulkSubmit : handleSingleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <RotatingLines visible height="20" width="20" color="white" strokeWidth="5" animationDuration="0.75" />
                        ) : (
                            <>
                                {isBulkUpload ? (
                                    <FiUpload size={16} className="me-2" />
                                ) : (
                                    <FiSave size={16} className="me-2" />
                                )}
                                <span>{isBulkUpload ? 'Upload Users' : 'Add User'}</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    )
}

export default AddUsers