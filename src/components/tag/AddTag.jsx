'use client'
import React, { useState, useRef } from 'react'
import topTost from '@/utils/topTost'
import { FiSave, FiTag } from 'react-icons/fi'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'

const validateTagName = (value) => {
  const trimmed = (value || '').trim()

  if (!trimmed) return 'Tag name is required'

  if (trimmed.length < 3)
    return 'Tag name must be at least 3 characters'

  if (trimmed.length > 100)
    return 'Tag name must be under 100 characters'

  if (!/^[a-zA-Z\s&.,'-]+$/.test(trimmed))
    return 'Only letters are allowed (no numbers)'

  return ''
}

const AddTag = () => {
  const [tagName, setTagName] = useState('')
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const tagNameRef = useRef(null)

  const handleChange = (value) => {
    setTagName(value)
    if (touched) setError(validateTagName(value))
  }

  const handleBlur = () => {
    setTouched(true)
    setError(validateTagName(tagName))
  }

  const handleSubmit = async () => {
    setTouched(true)
    const validationError = validateTagName(tagName)
    setError(validationError)

    if (validationError) {
      tagNameRef.current?.focus()
      return
    }

    try {
      setSubmitting(true)
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/add-tag`,
        { TagName: tagName.trim() },
        { withCredentials: true }
      )
      topTost?.('success', 'Tag created successfully!')
      setTagName('')
      setTouched(false)
      setError('')
    } catch (err) {
      console.error('Failed to create tag:', err)
      const message = err?.response?.data?.message || 'Failed to create tag. Please try again.'
      topTost?.('error', message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="col-xl-6">
      <div className="card stretch stretch-full">
        <div className="card-body">
          <h5>Add Tag</h5>

          <div className="row mt-3">
            <div className="col-lg-9 mb-4">
              <label className="form-label">
                Tag Name <span className="text-danger">*</span>
              </label>
              <div className="position-relative">
                <FiTag
                  size={14}
                  className="text-muted position-absolute"
                  style={{ left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
                />
                <input
                  ref={tagNameRef}
                  type="text"
                  className={`form-control ps-5 mb-0 ${touched ? (error ? 'is-invalid' : '') : ''
                    }`}
                  placeholder="Enter tag name"
                  value={tagName}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  disabled={submitting}
                  maxLength={100}
                />
              </div>
              {touched && error && (
                <div className="invalid-feedback d-block">{error}</div>
              )}
            </div>
          </div>

          <div className="col-12 d-flex justify-content-end mt-2">
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <RotatingLines
                  visible={true}
                  height="30"
                  width="30"
                  color="white"
                  strokeWidth="5"
                  animationDuration="0.75"
                  ariaLabel="submitting-tag"
                />
              ) : (
                <>
                  <FiSave size={16} className="me-2" />
                  <span>Add Tag</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddTag