'use client'
import React, { useState, useRef } from 'react'
import topTost from '@/utils/topTost'
import { FiSave, FiCheckSquare } from 'react-icons/fi'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'

const validateEvaluationPoint = (value) => {
  const trimmed = (value || '').trim()

  if (!trimmed) return 'Evaluation point is required'

  if (trimmed.length < 3)
    return 'Evaluation point must be at least 3 characters'

  if (trimmed.length > 100)
    return 'Evaluation point must be under 100 characters'

  if (!/^[a-zA-Z\s&.,'-]+$/.test(trimmed))
    return 'Only letters are allowed (no numbers)'

  return ''
}

const AddEvaluationPoint = () => {
  const [evaluationPoint, setEvaluationPoint] = useState('')
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const evaluationPointRef = useRef(null)

  const handleChange = (value) => {
    setEvaluationPoint(value)
    if (touched) setError(validateEvaluationPoint(value))
  }

  const handleBlur = () => {
    setTouched(true)
    setError(validateEvaluationPoint(evaluationPoint))
  }

  const handleSubmit = async () => {
    setTouched(true)
    const validationError = validateEvaluationPoint(evaluationPoint)
    setError(validationError)

    if (validationError) {
      evaluationPointRef.current?.focus()
      return
    }

    try {
      setSubmitting(true)
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/add-evalution-point`,
        { EvaluationPoint: evaluationPoint.trim() },
        { withCredentials: true }
      )
      topTost?.('success', 'Evaluation point created successfully!')
      setEvaluationPoint('')
      setTouched(false)
      setError('')
    } catch (err) {
      console.error('Failed to create evaluation point:', err)
      const message = err?.response?.data?.message || 'Failed to create evaluation point. Please try again.'
      topTost?.('error', message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="col-xl-6">
      <div className="card stretch stretch-full">
        <div className="card-body">
          <h5>Add Evaluation Point</h5>

          <div className="row mt-3">
            <div className="col-lg-9 mb-4">
              <label className="form-label">
                Evaluation Point <span className="text-danger">*</span>
              </label>
              <div className="position-relative">
                <input
                  ref={evaluationPointRef}
                  type="text"
                  className={`form-control mb-0 ${touched ? (error ? 'is-invalid' : '') : ''
                    }`}
                  placeholder="Enter evaluation point"
                  value={evaluationPoint}
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
                  ariaLabel="submitting-evaluation-point"
                />
              ) : (
                <>
                  <FiSave size={16} className="me-2" />
                  <span>Add Evaluation Point</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddEvaluationPoint