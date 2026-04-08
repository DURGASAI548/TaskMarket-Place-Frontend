'use client'
import React, { useState, useEffect, useRef } from 'react'
import SelectDropdown from '@/components/shared/SelectDropdown'
import topTost from '@/utils/topTost'
import { FiSave } from 'react-icons/fi'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'

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

const initialFormData = {
  branchName: '',
  organization: null,
  branchAdmin: null,
  description: '',
}

const initialTouched = {
  branchName: false,
  organization: false,
  branchAdmin: false,
  description: false,
}

const initialErrors = {
  branchName: '',
  organization: '',
  branchAdmin: '',
  description: '',
}

const AddBranch = () => {
  const [formData, setFormData] = useState({ ...initialFormData })
  const [errors, setErrors] = useState({ ...initialErrors })
  const [touched, setTouched] = useState({ ...initialTouched })

  const [organizationOptions, setOrganizationOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])

  const [submittingLoading, setSubmittingLoading] = useState(false)
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  const branchNameRef = useRef(null)
  const descriptionRef = useRef(null)

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoadingOrgs(true)
        const result = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/get-organizations`,
          { withCredentials: true }
        )
        const data = result.data.data.map((ele) => ({
          value: ele._id,
          label: ele.orgName,
          img: '',
        }))
        setOrganizationOptions(data)
      } catch (err) {
        console.error('Failed to fetch organizations:', err)
        topTost?.('error', 'Failed to load organizations. Please refresh.')
      } finally {
        setLoadingOrgs(false)
      }
    }
    fetchOrganizations()
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true)
        const result = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/get-normal-users`,
          { withCredentials: true }
        )
        const data = result.data.data.map((ele) => ({
          value: ele._id,
          label: ele.name,
          img: ele.profileURL,
        }))
        setUserOptions(data)
      } catch (err) {
        console.error('Failed to fetch users:', err)
        topTost?.('error', 'Failed to load users. Please refresh.')
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchUsers()
  }, [])

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

  const handleSubmit = async () => {
    setTouched({
      branchName: true,
      organization: true,
      branchAdmin: true,
      description: true,
    })

    const newErrors = {
      branchName: validateBranchName(formData.branchName),
      organization: validateOrganization(formData.organization),
      branchAdmin: validateAdmin(formData.branchAdmin),
      description: validateDescription(formData.description),
    }
    setErrors(newErrors)

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

    const payload = {
      branchName: formData.branchName.trim(),
      orgId: formData.organization,
      branchAdmin: formData.branchAdmin,
      branchDescription: formData.description.trim(),
    }

    try {
      setSubmittingLoading(true)

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/add-branch`,
        payload,
        { withCredentials: true }
      )

      topTost?.('success', 'Branch created successfully!')

      setFormData({ ...initialFormData })
      setTouched({ ...initialTouched })
      setErrors({ ...initialErrors })
    } catch (err) {
      console.error('Failed to create branch:', err)
      const message =
        err?.response?.data?.message || 'Failed to create branch. Please try again.'
      topTost?.('error', message)
    } finally {
      setSubmittingLoading(false)
    }
  }

  const descCharCount = formData.description.trim().length

  return (
    <>
      <div className="col-xl-8">
        <div className="card stretch stretch-full">
          <div className="card-body">
            <h5>Add Branch</h5>

            <div>
              <div className="row">
                <div className="col-lg-6 mb-4">
                  <label className="form-label">
                    Branch Name <span className="text-danger">*</span>
                  </label>
                  <input
                    ref={branchNameRef}
                    type="text"
                    className={`form-control mb-0 `}
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

            <div>
              <label className="form-label">
                Branch Description <span className="text-danger">*</span>
              </label>
              <div className="row">
                <div className="col-lg-12 mb-2">
                  <textarea
                    ref={descriptionRef}
                    rows={5}
                    className={`form-control`}
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
                    <span>Add Branch</span>
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

export default AddBranch