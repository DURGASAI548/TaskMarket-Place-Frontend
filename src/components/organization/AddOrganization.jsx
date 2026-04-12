'use client'
import React, { useState, useEffect, useRef } from 'react'
import SelectDropdown from '@/components/shared/SelectDropdown'
import topTost from '@/utils/topTost'
import { FiSave } from 'react-icons/fi'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'

const validateOrgName = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return 'Organization name is required'
  if (trimmed.length < 2) return 'Name must be at least 2 characters'
  if (trimmed.length > 100) return 'Name must be under 100 characters'
  if (!/^[a-zA-Z0-9\s&.,'-]+$/.test(trimmed))
    return 'Name contains invalid characters'
  return ''
}

const validateDescription = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return 'Organization description is required'
  if (trimmed.length < 10) return 'Description must be at least 10 characters'
  if (trimmed.length > 500) return 'Description must be under 500 characters'
  return ''
}

const AddOrganization = () => {
  const [formData, setFormData] = useState({
    orgName: '',
    orgAdmin: null,
    description: '',
  })
  const [errors, setErrors] = useState({
    orgName: '',
    description: '',
  })
  const [touched, setTouched] = useState({
    orgName: false,
    description: false,
  })
  const [currencyOptionsData_1, setCurrencyOptionsData_1] = useState([])
  const [submittingloading, setSubmittingLoading] = useState(false)
  const [loadingusers, setLoadingUsers] = useState(false)
  const orgNameRef = useRef(null)
  const descriptionRef = useRef(null)

  // useEffect(() => {
  //   const fetchUsers = async () => {
  //     try {
  //       setLoadingUsers(true)
  //       const result = await axios.get(
  //         `${process.env.NEXT_PUBLIC_API_URL}/api/get-normal-users`,
  //         { withCredentials: true }
  //       )
  //       const data = result.data.data.map((ele) => ({
  //         value: ele._id,
  //         label: ele.name,
  //         img: ele.profileURL,
  //       }))

  //       setCurrencyOptionsData_1(data)
  //     } catch (err) {
  //       console.log('Failed to fetch users:', err)
  //       topTost?.('error', 'Failed to load users. Please refresh.')
  //     } finally {
  //       setLoadingUsers(false)
  //     }
  //   }
  //   fetchUsers()
  // }, [])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (touched[field]) {
      let error = ''
      if (field === 'orgName') error = validateOrgName(value)
      else if (field === 'description') error = validateDescription(value)
      setErrors((prev) => ({ ...prev, [field]: error }))
    }
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    let error = ''
    const value = formData[field]
    if (field === 'orgName') error = validateOrgName(value)
    else if (field === 'description') error = validateDescription(value)
    setErrors((prev) => ({ ...prev, [field]: error }))
  }

  const handleAdminSelect = (option) => {
    const selectedValue = option?.value || null
    setFormData((prev) => ({ ...prev, orgAdmin: selectedValue }))
  }

  const handleClearAdmin = () => {
    setFormData((prev) => ({ ...prev, orgAdmin: null }))
  }

  const handleSubmit = async () => {
    setTouched({
      orgName: true,
      description: true,
    })
    const orgNameError = validateOrgName(formData.orgName)
    const descriptionError = validateDescription(formData.description)
    const newErrors = {
      orgName: orgNameError,
      description: descriptionError,
    }
    setErrors(newErrors)

    if (orgNameError) {
      orgNameRef.current?.focus()
      return
    }
    if (descriptionError) {
      descriptionRef.current?.focus()
      return
    }

    // orgAdmin is optional — send _id if selected, null if not
    const payload = {
      orgName: formData.orgName.trim(),
      orgAdminUser: formData.orgAdmin || null,
      orgDescription: formData.description.trim(),
    }

    try {
      setSubmittingLoading(true)
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/add-organization`,
        payload,
        { withCredentials: true }
      )
      topTost?.('success', 'Organization created successfully!')
      setFormData({ orgName: '', orgAdmin: null, description: '' })
      setTouched({ orgName: false, description: false })
      setErrors({ orgName: '', description: '' })
    } catch (err) {
      console.log('Failed to create organization:', err)
      const message =
        err?.response?.data?.message || 'Failed to create organization. Please try again.'
      topTost?.('error', message)
    } finally {
      setSubmittingLoading(false)
    }
  }

  const descCharCount = formData.description.trim().length

  const selectedAdminOption = currencyOptionsData_1.find(
    (opt) => opt.value === formData.orgAdmin
  ) || null

  return (
    <>
      <div className="col-xl-8">
        <div className="card stretch stretch-full">
          <div className="card-body">
            <h5>Add Organization</h5>
            <div>
              <div className="row">
                <div className="col-lg-6 mb-4">
                  <label className="form-label">
                    Organization Name <span className="text-danger">*</span>
                  </label>
                  <input
                    ref={orgNameRef}
                    type="text"
                    className={`form-control mb-0 ${
                      touched.orgName
                        ? errors.orgName
                          ? 'is-invalid'
                          : 'is-valid'
                        : ''
                    }`}
                    placeholder="Org Name"
                    value={formData.orgName}
                    onChange={(e) => handleChange('orgName', e.target.value)}
                    onBlur={() => handleBlur('orgName')}
                    disabled={submittingloading}
                    maxLength={100}
                  />
                  {touched.orgName && errors.orgName && (
                    <div className="invalid-feedback d-block">
                      {errors.orgName}
                    </div>
                  )}
                </div>

                {/* <div className="col-lg-6 mb-4">
                  <label className="form-label">
                    Organization Admin
                    <span className="text-muted fs-11 ms-1">(optional)</span>
                  </label>
                  {loadingusers ? (
                    <div className="d-flex justify-content-center align-items-center">
                      <RotatingLines
                        visible={true}
                        height="30"
                        width="30"
                        color="blue"
                        strokeWidth="5"
                        animationDuration="0.75"
                        ariaLabel="rotating-lines-loading"
                      />
                      &nbsp;
                      <span>Bringing all the users</span>
                    </div>
                  ) : (
                    <>
                      <div className="position-relative">
                        <SelectDropdown
                          options={currencyOptionsData_1}
                          selectedOption={selectedAdminOption}
                          defaultSelect=""
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
                        You can assign an admin later if needed
                      </div>
                    </>
                  )}
                </div> */}
              </div>
            </div>

            <div>
              <label className="form-label">
                Organization Description <span className="text-danger">*</span>
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
                    placeholder="Enter organization description (min 10 characters)"
                    value={formData.description}
                    onChange={(e) =>
                      handleChange('description', e.target.value)
                    }
                    onBlur={() => handleBlur('description')}
                    disabled={submittingloading}
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

            <div className="col-12 d-flex justify-content-end mt-4">
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submittingloading}
              >
                {submittingloading ? (
                  <RotatingLines
                    visible={true}
                    height="30"
                    width="30"
                    color="white"
                    strokeWidth="5"
                    animationDuration="0.75"
                    ariaLabel="rotating-lines-loading"
                  />
                ) : (
                  <>
                    <FiSave size={16} className="me-2" />
                    <span>Add Organization</span>
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

export default AddOrganization