'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import SelectDropdown from '@/components/shared/SelectDropdown'
import { FiSave } from 'react-icons/fi'
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
  description: validateDescription,
}

const EditBranch = () => {
  const params = useParams()
  const router = useRouter()
  const id = params.id

  const [formData, setFormData] = useState({
    branchName: '',
    organization: null,
    branchAdmin: null,
    description: '',
  })

  const [errors, setErrors] = useState({
    branchName: '',
    organization: '',
    description: '',
  })

  const [touched, setTouched] = useState({
    branchName: false,
    organization: false,
    description: false,
  })

  const [organizationOptions, setOrganizationOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])

  const [submittingLoading, setSubmittingLoading] = useState(false)
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingBranchData, setLoadingBranchData] = useState(true)
  const [fetchError, setFetchError] = useState('')

  const branchNameRef = useRef(null)
  const descriptionRef = useRef(null)

  const [adminId, setadminId] = useState(null)
  const [orgId , setorgId] = useState(null)
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoadingBranchData(true)
        setLoadingOrgs(true)
        setLoadingUsers(true)
        setFetchError('')

        const [usersRes, orgsRes, branchRes] = await Promise.all([
          axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/get-normal-users-for-branch/${id}`,
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

        const getId = (val) =>
          typeof val === 'object' && val !== null ? val._id : val || null

        let usersData = usersRes.data.data.map((ele) => ({
          value: ele._id,
          label: ele.name,
        }))

        let orgsData = orgsRes.data.data.map((ele) => ({
          value: ele._id,
          label: ele.orgName,
        }))

        const branch = branchRes.data.data
        console.log("Branch Data:", branch)

        const adminIdLocal = getId(branch.branchAdminUser)
        const orgIdLocal = getId(branch.org)

        setadminId(adminIdLocal)
        setorgId(orgIdLocal)

        if (adminIdLocal && !usersData.find((u) => u.value === adminIdLocal)) {
          const adminObj = branch.branchAdminUser

          usersData.unshift({
            value: adminIdLocal,
            label:
              typeof adminObj === 'object'
                ? adminObj.name || adminObj.email || 'Unknown User'
                : 'Previous Admin',
          })
        }

        if (orgIdLocal && !orgsData.find((o) => o.value === orgIdLocal)) {
          const orgObj = branch.org

          orgsData.unshift({
            value: orgIdLocal,
            label:
              typeof orgObj === 'object'
                ? orgObj.orgName || 'Unknown Organization'
                : 'Previous Organization',
          })
        }

        setUserOptions(usersData)
        setOrganizationOptions(orgsData)

        setFormData({
          branchName: branch.branchName || '',
          organization: orgIdLocal,
          branchAdmin: adminIdLocal,
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

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Only validate fields that have validators (branchAdmin doesn't)
    if (touched[field] && validators[field]) {
      setErrors((prev) => ({ ...prev, [field]: validators[field](value) }))
    }
  }

  const handleBlur = (field) => {
    if (validators[field]) {
      setTouched((prev) => ({ ...prev, [field]: true }))
      setErrors((prev) => ({ ...prev, [field]: validators[field](formData[field]) }))
    }
  }

  const handleDropdownSelect = (field, option) => {
    const selectedValue = option?.value || null
    handleChange(field, selectedValue)

    if (validators[field]) {
      setTouched((prev) => ({ ...prev, [field]: true }))
      setErrors((prev) => ({ ...prev, [field]: validators[field](selectedValue) }))
    }
  }

  const handleAdminSelect = (option) => {
    const selectedValue = option?.value || null
    setFormData((prev) => ({ ...prev, branchAdmin: selectedValue }))
  }

  const handleClearAdmin = () => {
    setFormData((prev) => ({ ...prev, branchAdmin: null }))
  }

  const handleSubmit = async () => {
    setTouched({
      branchName: true,
      organization: true,
      description: true,
    })

    const newErrors = {
      branchName: validateBranchName(formData.branchName),
      organization: validateOrganization(formData.organization),
      description: validateDescription(formData.description),
    }
    setErrors(newErrors)

    if (newErrors.branchName) {
      branchNameRef.current?.focus()
      return
    }
    if (newErrors.organization) return
    if (newErrors.description) {
      descriptionRef.current?.focus()
      return
    }

    const payload = {
      branchName: formData.branchName.trim(),
      org: formData.organization,
      branchAdminUser: formData.branchAdmin || null,
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

      setTouched({ branchName: false, organization: false, description: false })
      setErrors({ branchName: '', organization: '', description: '' })
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

  const descCharCount = formData.description.trim().length

  const selectedAdminOption = userOptions.find(
    (opt) => opt.value === formData.branchAdmin
  ) || null

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
                <div className="col-lg-6 mb-4">
                  <label className="form-label">
                    Branch Name <span className="text-danger">*</span>
                  </label>
                  <input
                    ref={branchNameRef}
                    type="text"
                    className={`form-control mb-0 ${touched.branchName
                      ? errors.branchName
                        ? 'is-invalid'
                        : ''
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
                        defaultSelect={orgId}
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
                    Branch Admin
                    <span className="text-muted fs-11 ms-1">(optional)</span>
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
                      <div className="position-relative">
                        <SelectDropdown
                          options={userOptions}
                          selectedOption={selectedAdminOption}
                          defaultSelect={adminId}
                          onSelectOption={handleAdminSelect}
                        />
                        {selectedAdminOption && (
                          <button
                            type="button"
                            className="btn btn-sm position-absolute border-0 p-0"
                            style={{ right: 36, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
                            onClick={handleClearAdmin}
                            title="Clear selection"
                          >
                            <span className="text-muted fs-12">✕</span>
                          </button>
                        )}
                      </div>
                      <div className="fs-11 text-muted mt-1">
                        You can change or remove the admin anytime
                      </div>
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
                    className={`form-control ${touched.description
                      ? errors.description
                        ? 'is-invalid'
                        : ''
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
                      className={`${descCharCount > 450 ? 'text-warning' : 'text-muted'
                        } ${descCharCount >= 500 ? 'text-danger' : ''}`}
                    >
                      {descCharCount}/500
                    </small>
                  </div>
                </div>
              </div>
            </div>

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