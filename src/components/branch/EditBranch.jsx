'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import SelectDropdown from '@/components/shared/SelectDropdown'
import { FiSave } from 'react-icons/fi'
import axios from 'axios'

// ── Validation Rules ──────────────────────────────────────
const validateBranchName = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return 'Branch name is required'
  if (trimmed.length < 2) return 'Name must be at least 2 characters'
  if (trimmed.length > 100) return 'Name must be under 100 characters'
  if (!/^[a-zA-Z0-9\s&.,'-]+$/.test(trimmed))
    return 'Name contains invalid characters'
  return ''
}

const validateOrganization = (value) => {
  if (!value) return 'Please select an organization'
  return ''
}

const validateAdmin = (value) => {
  if (!value) return 'Please select a branch admin'
  return ''
}

const validateDescription = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return 'Branch description is required'
  if (trimmed.length < 10) return 'Description must be at least 10 characters'
  if (trimmed.length > 500) return 'Description must be under 500 characters'
  return ''
}

const validators = {
  branchName: validateBranchName,
  organization: validateOrganization,
  branchAdmin: validateAdmin,
  description: validateDescription,
}

// ── Component ─────────────────────────────────────────────
const EditBranch = () => {
  const params = useParams()
  const router = useRouter()
  const id = params.id

  // ── Form State ────────────────────────────────────────
  const [formData, setFormData] = useState({
    branchName: '',
    organization: null,
    branchAdmin: null,
    description: '',
  })

  const [errors, setErrors] = useState({
    branchName: '',
    organization: '',
    branchAdmin: '',
    description: '',
  })

  const [touched, setTouched] = useState({
    branchName: false,
    organization: false,
    branchAdmin: false,
    description: false,
  })

  // ── Dropdown Data ─────────────────────────────────────
  const [organizationOptions, setOrganizationOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])

  // ── UI State ──────────────────────────────────────────
  const [submittingLoading, setSubmittingLoading] = useState(false)
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingBranchData, setLoadingBranchData] = useState(true)
  const [fetchError, setFetchError] = useState('')

  // ── Refs ──────────────────────────────────────────────
  const branchNameRef = useRef(null)
  const descriptionRef = useRef(null)

  // ── Fetch All Data in Parallel ────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoadingBranchData(true)
        setLoadingOrgs(true)
        setLoadingUsers(true)
        setFetchError('')

        const [usersRes, orgsRes, branchRes] = await Promise.all([
          axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/get-normal-users`,
            { withCredentials: true }
          ),
          axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/get-organizations-list`,
            { withCredentials: true }
          ),
          axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/get-branch/${id}`,
            { withCredentials: true }
          ),
        ])

        // ── Build users dropdown ──────────────────────
        const usersData = usersRes.data.data.map((ele) => ({
          value: ele._id,
          label: ele.name,
          img: ele.profileURL,
        }))

        // ── Build organizations dropdown ──────────────
        const orgsData = orgsRes.data.data.map((ele) => ({
          value: ele._id,
          label: ele.orgName,
          img: '',
        }))

        // ── Extract branch data ───────────────────────
        const branch = branchRes.data.data

        // Handle branchAdmin — could be plain ID or populated object
        const adminId =
          typeof branch.branchAdmin === 'object' && branch.branchAdmin !== null
            ? branch.branchAdmin._id
            : branch.branchAdmin || null

        // Handle org — could be plain ID or populated object
        const orgId =
          typeof branch.org === 'object' && branch.org !== null
            ? branch.org._id
            : branch.org || null

        // If previous admin isn't in users list, inject them
        if (adminId && !usersData.find((u) => u.value === adminId)) {
          const adminObj = branch.branchAdmin
          usersData.unshift({
            value: adminId,
            label:
              typeof adminObj === 'object'
                ? adminObj.name || adminObj.email || 'Unknown User'
                : branch.adminName || 'Previous Admin',
            img:
              typeof adminObj === 'object' ? adminObj.profileURL || '' : '',
          })
        }

        // If previous org isn't in orgs list, inject it
        if (orgId && !orgsData.find((o) => o.value === orgId)) {
          const orgObj = branch.org
          orgsData.unshift({
            value: orgId,
            label:
              typeof orgObj === 'object'
                ? orgObj.orgName || 'Unknown Organization'
                : branch.orgName || 'Previous Organization',
            img: '',
          })
        }

        setUserOptions(usersData)
        setOrganizationOptions(orgsData)

        setFormData({
          branchName: branch.branchName || '',
          organization: orgId,
          branchAdmin: adminId,
          description: branch.branchDescription || '',
        })
      } catch (err) {
        console.error('Failed to load data:', err)
        setFetchError('Failed to load branch data. Please try again.')
        topTost?.('error', 'Failed to load data. Please refresh.')
      } finally {
        setLoadingBranchData(false)
        setLoadingOrgs(false)
        setLoadingUsers(false)
      }
    }

    if (id) fetchAll()
  }, [id])

  // ── Handlers ──────────────────────────────────────────
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validators[field](value) }))
    }
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validators[field](formData[field]) }))
  }

  const handleDropdownSelect = (field, option) => {
    const selectedValue = option?.value || null
    handleChange(field, selectedValue)
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validators[field](selectedValue) }))
  }

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    // Mark all touched
    setTouched({
      branchName: true,
      organization: true,
      branchAdmin: true,
      description: true,
    })

    // Run all validations
    const newErrors = {
      branchName: validateBranchName(formData.branchName),
      organization: validateOrganization(formData.organization),
      branchAdmin: validateAdmin(formData.branchAdmin),
      description: validateDescription(formData.description),
    }
    setErrors(newErrors)

    // Focus first invalid field
    if (newErrors.branchName) {
      branchNameRef.current?.focus()
      return
    }
    if (newErrors.organization) return
    if (newErrors.branchAdmin) return
    if (newErrors.description) {
      descriptionRef.current?.focus()
      return
    }

    // ── All valid — update branch ───────────────────────
    const payload = {
      branchName: formData.branchName.trim(),
      orgId: formData.organization,
      branchAdmin: formData.branchAdmin,
      branchDescription: formData.description.trim(),
    }

    try {
      setSubmittingLoading(true)

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/edit-branches/${id}`,
        payload,
        { withCredentials: true }
      )

      topTost?.('success', 'Branch updated successfully!')

      // Reset touched/errors but KEEP the updated data
      setTouched({ branchName: false, organization: false, branchAdmin: false, description: false })
      setErrors({ branchName: '', organization: '', branchAdmin: '', description: '' })
    } catch (err) {
      console.error('Failed to update branch:', err)
      const message =
        err?.response?.data?.message ||
        'Failed to update branch. Please try again.'
      topTost?.('error', message)
    } finally {
      setSubmittingLoading(false)
    }
  }

  // ── Character count ───────────────────────────────────
  const descCharCount = formData.description.trim().length

  // ── Loading State ─────────────────────────────────────
  if (loadingBranchData) {
    return (
      <div className="col-xl-8">
        <div className="card stretch stretch-full">
          <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
            <RotatingLines
              visible={true}
              height="40"
              width="40"
              color="blue"
              strokeWidth="5"
              animationDuration="0.75"
              ariaLabel="loading-branch-data"
            />
            <p className="text-muted mt-3 mb-0">Loading branch data...</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Error State ───────────────────────────────────────
  if (fetchError) {
    return (
      <div className="col-xl-8">
        <div className="card stretch stretch-full">
          <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
            <p className="text-danger mb-3">{fetchError}</p>
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="col-xl-8">
        <div className="card stretch stretch-full">
          <div className="card-body">
            <h5>Edit Branch</h5>

            <div>
              <div className="row">
                {/* ── Branch Name ───────────────────────── */}
                <div className="col-lg-6 mb-4">
                  <label className="form-label">
                    Branch Name <span className="text-danger">*</span>
                  </label>
                  <input
                    ref={branchNameRef}
                    type="text"
                    className={`form-control mb-0 ${
                      touched.branchName
                        ? errors.branchName
                          ? 'is-invalid'
                          : 'is-valid'
                        : ''
                    }`}
                    placeholder="Branch Name"
                    value={formData.branchName}
                    onChange={(e) => handleChange('branchName', e.target.value)}
                    onBlur={() => handleBlur('branchName')}
                    disabled={submittingLoading}
                    maxLength={100}
                  />
                  {touched.branchName && errors.branchName && (
                    <div className="invalid-feedback d-block">
                      {errors.branchName}
                    </div>
                  )}
                </div>

                {/* ── Organization ──────────────────────── */}
                <div className="col-lg-6 mb-4">
                  <label className="form-label">
                    Organization <span className="text-danger">*</span>
                  </label>
                  {loadingOrgs ? (
                    <div className="d-flex justify-content-center align-items-center">
                      <RotatingLines
                        visible={true}
                        height="30"
                        width="30"
                        color="blue"
                        strokeWidth="5"
                        animationDuration="0.75"
                        ariaLabel="loading-organizations"
                      />
                      &nbsp;
                      <span className="text-muted">Loading organizations...</span>
                    </div>
                  ) : (
                    <>
                      <SelectDropdown
                        options={organizationOptions}
                        selectedOption={
                          organizationOptions.find(
                            (opt) => opt.value === formData.organization
                          ) || null
                        }
                        defaultSelect=""
                        onSelectOption={(option) =>
                          handleDropdownSelect('organization', option)
                        }
                      />
                      {touched.organization && errors.organization && (
                        <div
                          className="text-danger mt-1"
                          style={{ fontSize: '0.875em' }}
                        >
                          {errors.organization}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="row">
                {/* ── Branch Admin ──────────────────────── */}
                <div className="col-lg-6 mb-4">
                  <label className="form-label">
                    Branch Admin <span className="text-danger">*</span>
                  </label>
                  {loadingUsers ? (
                    <div className="d-flex justify-content-center align-items-center">
                      <RotatingLines
                        visible={true}
                        height="30"
                        width="30"
                        color="blue"
                        strokeWidth="5"
                        animationDuration="0.75"
                        ariaLabel="loading-users"
                      />
                      &nbsp;
                      <span className="text-muted">Loading users...</span>
                    </div>
                  ) : (
                    <>
                      <SelectDropdown
                        options={userOptions}
                        selectedOption={
                          userOptions.find(
                            (opt) => opt.value === formData.branchAdmin
                          ) || null
                        }
                        defaultSelect=""
                        onSelectOption={(option) =>
                          handleDropdownSelect('branchAdmin', option)
                        }
                      />
                      {touched.branchAdmin && errors.branchAdmin && (
                        <div
                          className="text-danger mt-1"
                          style={{ fontSize: '0.875em' }}
                        >
                          {errors.branchAdmin}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Branch Description ──────────────────── */}
            <div>
              <label className="form-label">
                Branch Description <span className="text-danger">*</span>
              </label>
              <div className="row">
                <div className="col-lg-12 mb-2">
                  <textarea
                    ref={descriptionRef}
                    rows={5}
                    className={`form-control ${
                      touched.description
                        ? errors.description
                          ? 'is-invalid'
                          : 'is-valid'
                        : ''
                    }`}
                    placeholder="Enter branch description (min 10 characters)"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    onBlur={() => handleBlur('description')}
                    disabled={submittingLoading}
                    maxLength={500}
                  />
                  {touched.description && errors.description && (
                    <div className="invalid-feedback d-block">
                      {errors.description}
                    </div>
                  )}
                  <div className="d-flex justify-content-end mt-1">
                    <small
                      className={`${
                        descCharCount > 450 ? 'text-warning' : 'text-muted'
                      } ${descCharCount >= 500 ? 'text-danger' : ''}`}
                    >
                      {descCharCount}/500
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Submit Button ───────────────────────── */}
            <div className="col-12 d-flex justify-content-end mt-4">
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submittingLoading}
              >
                {submittingLoading ? (
                  <RotatingLines
                    visible={true}
                    height="30"
                    width="30"
                    color="white"
                    strokeWidth="5"
                    animationDuration="0.75"
                    ariaLabel="submitting-branch"
                  />
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
      </div>
    </>
  )
}

export default EditBranch