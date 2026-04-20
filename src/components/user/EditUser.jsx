'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'
import SelectDropdown from '@/components/shared/SelectDropdown'
import { FiCamera, FiSave, FiX, FiUser, FiTag, FiMail, FiPhone, FiUsers, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'


const validateName = (value) => {
    const trimmed = (value || '').trim()
    if (!trimmed) return 'Name is required'
    if (trimmed.length < 2) return 'Name must be at least 2 characters'
    if (trimmed.length > 100) return 'Name must be under 100 characters'
    if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return 'Name contains invalid characters'
    return ''
}

const validateRollNumber = (value) => {
    const trimmed = (value || '').trim()
    if (!trimmed) return 'Roll number is required'
    if (trimmed.length < 1) return 'Roll number is too short'
    if (trimmed.length > 30) return 'Roll number must be under 30 characters'
    if (!/^[a-zA-Z0-9-/]+$/.test(trimmed)) return 'Roll number can only contain letters, numbers, hyphens, and slashes'
    return ''
}

const validateEmail = (value) => {
    const trimmed = (value || '').trim()
    if (!trimmed) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address'
    if (trimmed.length > 254) return 'Email must be under 254 characters'
    return ''
}

const validateUsername = (value) => {
    const trimmed = (value || '').trim()
    if (!trimmed) return 'Display name is required'
    if (trimmed.length < 3) return 'Display name must be at least 3 characters'
    if (trimmed.length > 50) return 'Display name must be under 50 characters'
    if (!/^[a-zA-Z0-9\s._-]+$/.test(trimmed)) return 'Display name contains invalid characters'
    return ''
}

const validatePhone = (value) => {
    const trimmed = (value || '').trim()
    if (!trimmed) return 'Phone number is required'
    if (!/^[+]?[0-9\s-]{7,15}$/.test(trimmed)) return 'Enter a valid phone number'
    return ''
}

const validateOrganization = (value) => (!value ? 'Please select an organization' : '')
const validateBranch = (value) => (!value ? 'Please select a branch' : '')

const validateAvatar = (file) => {
    if (!file) return ''
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg']
    if (!allowedTypes.includes(file.type)) return 'Only PNG, JPG, JPEG files are allowed'
    if (file.size > 2 * 1024 * 1024) return 'File size must be under 2MB'
    return ''
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

const initialForm = {
    name: '',
    rollNumber: '',
    email: '',
    organization: null,
    branch: null,
    username: '',
    phone: '',
}

const keys = Object.keys(initialForm)
const createTouched = (val = false) => keys.reduce((a, k) => ({ ...a, [k]: val }), {})
const createErrors  = ()            => keys.reduce((a, k) => ({ ...a, [k]: '' }), {})



const InputRow = ({ label, icon: Icon, fieldKey, type = 'text', inputRef, placeholder, maxLength, value, touched, error, onChange, onBlur, disabled }) => (
    <div className="mb-4">
        <label className="form-label fw-semibold">
            {label} <span className="text-danger">*</span>
        </label>
        <div className="position-relative">
            {Icon && <Icon size={15} className="text-muted position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />}
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
        {touched && error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
)

const DropdownField = ({ label, options, loading, loadingText, selectedValue, touched, error, fieldKey, onSelect, hint, form }) => (
    <div className="mb-4">
        <label className="form-label fw-semibold">
            {label} <span className="text-danger">*</span>
        </label>
        {console.log(label)}
        {loading ? (
            <div className="d-flex align-items-center py-2">
                <RotatingLines visible height="22" width="22" color="blue" strokeWidth="5" animationDuration="0.75" />
                <span className="text-muted fs-13 ms-2">{loadingText}</span>
            </div>
        ) : (
            <>
                <SelectDropdown
                    options={options}
                    selectedOption={options.find((o) => o.value === selectedValue) || null}
                    defaultSelect={label == "Organization" ? form.organization : form.branch}
                    onSelectOption={(option) => onSelect(fieldKey, option)}
                />
                {hint && !error && options.length === 0 && <div className="text-muted fs-11 mt-1">{hint}</div>}
                {touched && error && <div className="invalid-feedback d-block">{error}</div>}
            </>
        )}
    </div>
)

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


const EditUser = () => {
    const params = useParams()
    const router = useRouter()
    const userId = params?.id  

    const API = process.env.NEXT_PUBLIC_API_URL

    const [pageLoading, setPageLoading] = useState(true)
    const [pageError,   setPageError]   = useState('')

    const [existingProfileURL, setExistingProfileURL] = useState(null)

    const [form,    setForm]    = useState({ ...initialForm })
    const [errors,  setErrors]  = useState(createErrors())
    const [touched, setTouched] = useState(createTouched(false))

    const [avatarFile,    setAvatarFile]    = useState(null)   // new file selected
    const [avatarPreview, setAvatarPreview] = useState('/images/avatar/1.png')
    const [avatarError,   setAvatarError]   = useState('')

    const [orgWithBranches,    setOrgWithBranches]    = useState([])
    const [organizationOptions, setOrganizationOptions] = useState([])
    const [branchOptions,       setBranchOptions]       = useState([])
    const [loadingDropdowns,    setLoadingDropdowns]    = useState(true)

    const [submitting, setSubmitting] = useState(false)

    const nameRef     = useRef(null)
    const rollRef     = useRef(null)
    const emailRef    = useRef(null)
    const usernameRef = useRef(null)
    const phoneRef    = useRef(null)
    const avatarInputRef = useRef(null)



    useEffect(() => {
        if (!userId) return

        const loadAll = async () => {
            try {
                setPageLoading(true)
                setPageError('')

                const [orgRes, userRes] = await Promise.all([
                    axios.get(`${API}/api/get-org-with-branches`, { withCredentials: true }),
                    axios.get(`${API}/api/get-user-by-id/${userId}`, { withCredentials: true }),
                ])

                const orgData = orgRes.data.data || []
                setOrgWithBranches(orgData)
                setOrganizationOptions(
                    orgData.map((org) => ({ value: org.organizationId, label: org.organizationName, img: '' }))
                )

                const u = userRes.data.data || userRes.data.user || userRes.data
                console.log("user",u)

                console.log(u.org , typeof u.org)
                const orgId = typeof u.org === 'object' ? u.org?._id : u.org || null
                const branchId = typeof u.branch === 'object' ? u.branch?._id : u.branch || null
                console.log(orgId,branchId)
                setForm({
                    name:         u.name          || '',
                    rollNumber:   u.rollNo        || '',
                    email:        u.email         || '',
                    organization: orgId, 
                    branch:       branchId,
                    username:     u.displayName   || '',
                    phone:        String(u.phoneNo || ''),
                })
                // handleChange("organization",{
                //     value:u.org._id,
                //     label:u.org.orgName,
                //     img:null
                // })


                const profileURL = u.profile
                console.log(profileURL)
                const isValid = profileURL && profileURL !== 'null' && profileURL !== 'undefined' && profileURL.trim() !== ''
                console.log("isvalid",isValid)
                if (isValid) {
                    setExistingProfileURL(profileURL)
                    const s3Base = process.env.NEXT_PUBLIC_S3_BASE_URL || ''
                    setAvatarPreview(`${s3Base}${profileURL}`)

                }
            } catch (err) {
                console.error('Failed to load user data:', err)
                setPageError(err?.response?.data?.message || 'Failed to load user data. Please try again.')
            } finally {
                setPageLoading(false)
                setLoadingDropdowns(false)
            }
        }

        loadAll()
    }, [userId, API])


    const currentOrgId = form.organization

    useEffect(() => {
        if (currentOrgId) {
            const selectedOrg = orgWithBranches.find((o) => o.organizationId === currentOrgId)
            setBranchOptions(
                (selectedOrg?.branchesEligible || []).map((b) => ({ value: b.branchId, label: b.branchName, img: '' }))
            )
        } else {
            setBranchOptions([])
        }
    }, [currentOrgId, orgWithBranches])



    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        if (touched[field]) {
            setErrors((prev) => ({ ...prev, [field]: singleValidators[field](value) }))
        }
        // When org changes, reset branch
        if (field === 'organization') {
            setForm((prev) => ({ ...prev, organization: value, branch: null }))
            if (touched.branch) setErrors((prev) => ({ ...prev, branch: validateBranch(null) }))
        }
    }

    const handleBlur = (field) => {
        setTouched((prev) => ({ ...prev, [field]: true }))
        setErrors((prev) => ({ ...prev, [field]: singleValidators[field](form[field]) }))
    }

    const handleDropdown = (field, option) => {
        console.log(field,option)
        const val = option?.value || null
        handleChange(field, val)
        setTouched((prev) => ({ ...prev, [field]: true }))
        setErrors((prev) => ({ ...prev, [field]: singleValidators[field](val) }))
    }

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
        setAvatarPreview(existingProfileURL
            ? `${process.env.NEXT_PUBLIC_S3_BASE_URL || ''}${existingProfileURL}`
            : '/images/avatar/1.png')
        setAvatarError('')
        if (avatarInputRef.current) avatarInputRef.current.value = ''
    }



    const handleSubmit = async () => {
        // Mark all touched and validate
        setTouched(createTouched(true))

        const newErrors = {}
        keys.forEach((k) => { newErrors[k] = singleValidators[k](form[k]) })
        setErrors(newErrors)

        const avatarErr = avatarFile ? validateAvatar(avatarFile) : ''
        setAvatarError(avatarErr)

        // Focus first invalid field
        const fieldRefs = { name: nameRef, rollNumber: rollRef, email: emailRef, username: usernameRef, phone: phoneRef }
        for (const k of keys) {
            if (newErrors[k]) { fieldRefs[k]?.current?.focus(); return }
        }
        if (avatarErr) return

        // Build FormData (multipart so profile image can be included)
        const formData = new FormData()
        formData.append('name',        form.name.trim())
        formData.append('email',       form.email.trim())
        formData.append('displayName', form.username.trim())
        formData.append('rollNo',      form.rollNumber.trim())
        formData.append('phoneNo',     form.phone.trim())
        formData.append('org',         form.organization)
        formData.append('branch',      form.branch)
        // Only append profile if the user chose a new image
        if (avatarFile) formData.append('profile', avatarFile)

        try {
            setSubmitting(true)
            await axios.post(
                `${API}/api/edit-user/${userId}`,
                formData,
                { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
            )
            topTost?.('success', 'User updated successfully!')

            // Reset touched/errors but keep the form data visible
            setTouched(createTouched(false))
            setErrors(createErrors())
            setAvatarFile(null)     // new file is now "saved"
        } catch (err) {
            console.error('Failed to update user:', err)
            topTost?.('error', err?.response?.data?.message || 'Failed to update user. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }


    if (pageLoading) {
        return (
            <div className="col-xxl-8 col-xl-9 col-lg-10 col-12">
                <div className="card stretch stretch-full">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <RotatingLines visible height="40" width="40" color="blue" strokeWidth="5" animationDuration="0.75" />
                        <p className="text-muted mt-3 mb-0">Loading user data...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (pageError) {
        return (
            <div className="col-xxl-8 col-xl-9 col-lg-10 col-12">
                <div className="card stretch stretch-full">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10 mb-3" style={{ width: 56, height: 56 }}>
                            <FiAlertCircle size={24} className="text-danger" />
                        </div>
                        <h6 className="fw-bold mb-1">Failed to load user</h6>
                        <p className="text-muted fs-13 mb-3 text-center" style={{ maxWidth: 340 }}>{pageError}</p>
                        <button className="btn btn-outline-primary btn-sm d-flex align-items-center" onClick={() => window.location.reload()}>
                            <FiRefreshCw size={13} className="me-1" /> Retry
                        </button>
                    </div>
                </div>
            </div>
        )
    }



    return (
        <div className="col-xxl-8 col-xl-9 col-lg-10 col-12">
            <div className="card stretch stretch-full">

                <div className="card-header d-flex align-items-center justify-content-between">
                    <div>
                        <h5 className="card-title mb-0">Edit User</h5>
                        <p className="text-muted fs-12 mb-0 mt-1">Update the details below to edit this user account</p>
                    </div>
                </div>

                <div className="card-body">

                    <SectionDivider icon={FiCamera} title="Profile Photo" subtitle="Upload a new profile picture (optional)" />

                    <div className="mb-4">
                        <div className="d-flex gap-4 align-items-start">
                            <div className="position-relative flex-shrink-0">
                                <label htmlFor="avatar-input"
                                    className="wd-100 ht-100 position-relative overflow-hidden border border-gray-2 rounded d-block"
                                    style={{ cursor: 'pointer' }}>
                                    <img src={avatarPreview} className="img-fluid rounded h-100 w-100" alt="Avatar" style={{ objectFit: 'cover' }} />
                                    <div className="position-absolute start-50 top-50 translate-middle h-100 w-100 hstack align-items-center justify-content-center upload-button">
                                        <FiCamera className="camera-icon" />
                                    </div>
                                    <input ref={avatarInputRef} type="file" accept="image/png,image/jpg,image/jpeg"
                                        id="avatar-input" onChange={handleAvatarChange} disabled={submitting} hidden />
                                </label>
                                {avatarFile && (
                                    <button className="btn btn-sm btn-danger position-absolute rounded-circle p-0 d-flex align-items-center justify-content-center"
                                        style={{ width: 22, height: 22, top: -8, right: -8, zIndex: 2 }}
                                        onClick={removeAvatar} title="Remove new photo">
                                        <FiX size={12} />
                                    </button>
                                )}
                            </div>
                            <div className="d-flex flex-column gap-1 pt-2">
                                <span className="fs-12 text-muted">Click to upload a new photo</span>
                                <span className="fs-11 text-muted">Max size: 2MB</span>
                                <span className="fs-11 text-muted">Formats: PNG, JPG, JPEG</span>
                                {existingProfileURL && !avatarFile && (
                                    <span className="fs-11 text-success mt-1">✓ Current photo loaded</span>
                                )}
                            </div>
                        </div>
                        {avatarError && <div className="invalid-feedback d-block mt-2">{avatarError}</div>}
                    </div>

                    <hr className="my-4" />

                    <SectionDivider icon={FiUser} title="Personal Information" subtitle="Basic details about the user" />

                    <div className="row">
                        <div className="col-md-6">
                            <InputRow label="Full Name" icon={FiUser} fieldKey="name" inputRef={nameRef}
                                placeholder="Enter full name" maxLength={100}
                                value={form.name} touched={touched.name} error={errors.name}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting} />
                        </div>
                        <div className="col-md-6">
                            <InputRow label="Roll Number" icon={FiTag} fieldKey="rollNumber" inputRef={rollRef}
                                placeholder="Enter roll number" maxLength={30}
                                value={form.rollNumber} touched={touched.rollNumber} error={errors.rollNumber}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting} />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <InputRow label="Email Address" icon={FiMail} fieldKey="email" type="email" inputRef={emailRef}
                                placeholder="Enter email address" maxLength={254}
                                value={form.email} touched={touched.email} error={errors.email}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting} />
                        </div>
                        <div className="col-md-6">
                            <InputRow label="Phone Number" icon={FiPhone} fieldKey="phone" type="tel" inputRef={phoneRef}
                                placeholder="Enter phone number" maxLength={15}
                                value={form.phone} touched={touched.phone} error={errors.phone}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting} />
                        </div>
                    </div>

                    <hr className="my-4" />

                    <SectionDivider icon={FiUsers} title="Organization & Branch" subtitle="Assign the user to an organization and branch" />

                    <div className="row">
                        <div className="col-md-6">
                            <DropdownField label="Organization"
                                options={organizationOptions} loading={loadingDropdowns} loadingText="Loading data..."
                                selectedValue={form.organization} touched={touched.organization} error={errors.organization}
                                fieldKey="organization" onSelect={handleDropdown} form={form}/>
                        </div>
                        <div className="col-md-6">
                            <DropdownField label="Branch"
                                options={branchOptions} loading={loadingDropdowns} loadingText="Loading data..."
                                selectedValue={form.branch} touched={touched.branch} error={errors.branch}
                                fieldKey="branch" hint="Select an organization first to see available branches"
                                onSelect={handleDropdown} form={form}/>
                        </div>
                    </div>

                    <hr className="my-4" />

                    <SectionDivider icon={FiTag} title="Account Details" subtitle="Display name for the user's profile" />

                    <div className="row">
                        <div className="col-md-6">
                            <InputRow label="Display Name" icon={FiUser} fieldKey="username" inputRef={usernameRef}
                                placeholder="Enter display name" maxLength={50}
                                value={form.username} touched={touched.username} error={errors.username}
                                onChange={handleChange} onBlur={handleBlur} disabled={submitting} />
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

export default EditUser