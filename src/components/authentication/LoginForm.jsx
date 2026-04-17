'use client'

import Link from 'next/link'
import React, { useReducer, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'

// ══════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ══════════════════════════════════════════════════════════

const validateIdentifier = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Email or username is required'

    if (trimmed.includes('@')) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address'
        if (trimmed.length > 254) return 'Email must be under 254 characters'
    } else {
        if (trimmed.length < 3) return 'Username must be at least 3 characters'
        if (trimmed.length > 50) return 'Username must be under 50 characters'
        if (!/^[a-zA-Z0-9._-]+$/.test(trimmed))
            return 'Username can only contain letters, numbers, dots, hyphens, and underscores'
    }
    return ''
}

const validateOtp = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'OTP is required'
    if (!/^\d+$/.test(trimmed)) return 'OTP must contain only digits'
    if (trimmed.length < 4 || trimmed.length > 8) return 'OTP must be 4–8 digits'
    return ''
}

const validatePassword = (value) => {
    if (!value) return 'Password is required'
    if (value.length < 6) return 'Password must be at least 6 characters'
    if (value.length > 128) return 'Password must be under 128 characters'
    if (/\s/.test(value)) return 'Password must not contain spaces'
    return ''
}

const validateConfirmPassword = (password, confirm) => {
    if (!confirm) return 'Please confirm your password'
    if (password !== confirm) return 'Passwords do not match'
    return ''
}

// ══════════════════════════════════════════════════════════
// STATE MANAGEMENT (useReducer for complex multi-step flow)
// ══════════════════════════════════════════════════════════

const STEPS = {
    IDENTIFIER: 'IDENTIFIER',
    OTP: 'OTP',
    SET_PASSWORD: 'SET_PASSWORD',
}

const OTP_COOLDOWN_SECONDS = 60

const initialState = {
    // Flow
    step: STEPS.IDENTIFIER,

    // Shared across steps
    identifier: '',

    // Step 1: Identifier
    identifierError: '',
    identifierTouched: false,

    // Step 2: OTP
    otp: '',
    otpError: '',
    otpTouched: false,
    resendCooldown: 0, // seconds remaining before resend is allowed

    // Step 3: Set Password
    password: '',
    confirmPassword: '',
    passwordError: '',
    confirmPasswordError: '',
    passwordTouched: false,
    confirmPasswordTouched: false,

    // Global
    isSubmitting: false,
    apiError: '',
}

const reducer = (state, action) => {
    switch (action.type) {
        // ── Field updates ─────────────────────────────
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value, apiError: '' }

        case 'SET_FIELDS':
            return { ...state, ...action.fields, apiError: '' }

        // ── Step transitions ──────────────────────────
        case 'GOTO_OTP':
            return {
                ...state,
                step: STEPS.OTP,
                otp: '',
                otpError: '',
                otpTouched: false,
                resendCooldown: OTP_COOLDOWN_SECONDS,
                isSubmitting: false,
                apiError: '',
            }

        case 'GOTO_SET_PASSWORD':
            return {
                ...state,
                step: STEPS.SET_PASSWORD,
                password: '',
                confirmPassword: '',
                passwordError: '',
                confirmPasswordError: '',
                passwordTouched: false,
                confirmPasswordTouched: false,
                isSubmitting: false,
                apiError: '',
            }

        case 'GOTO_IDENTIFIER':
            return {
                ...initialState,
                identifier: state.identifier,
            }

        // ── Loading ───────────────────────────────────
        case 'SET_SUBMITTING':
            return { ...state, isSubmitting: action.value }

        // ── Errors ────────────────────────────────────
        case 'SET_API_ERROR':
            return { ...state, apiError: action.value, isSubmitting: false }

        // ── OTP timer ─────────────────────────────────
        case 'TICK_COOLDOWN':
            return { ...state, resendCooldown: Math.max(0, state.resendCooldown - 1) }

        case 'RESET_COOLDOWN':
            return { ...state, resendCooldown: OTP_COOLDOWN_SECONDS }

        default:
            return state
    }
}

// ══════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════

const LoginForm = ({ registerPath, resetPath }) => {
    const loginStore = useAuthStore((s) => s.login)
    const router = useRouter()
    const [state, dispatch] = useReducer(reducer, initialState)

    // Refs for auto-focus
    const identifierRef = useRef(null)
    const otpRef = useRef(null)
    const passwordRef = useRef(null)
    const confirmPasswordRef = useRef(null)

    // ── OTP Countdown Timer ─────────────────────────────
    useEffect(() => {
        if (state.step !== STEPS.OTP || state.resendCooldown <= 0) return

        const timer = setInterval(() => {
            dispatch({ type: 'TICK_COOLDOWN' })
        }, 1000)

        return () => clearInterval(timer)
    }, [state.step, state.resendCooldown])

    // ── Auto-focus on step change ───────────────────────
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (state.step === STEPS.IDENTIFIER) identifierRef.current?.focus()
            else if (state.step === STEPS.OTP) otpRef.current?.focus()
            else if (state.step === STEPS.SET_PASSWORD) passwordRef.current?.focus()
        }, 100)
        return () => clearTimeout(timeout)
    }, [state.step])

    // ── API base ────────────────────────────────────────
    const API = process.env.NEXT_PUBLIC_API_URL

    // ── Safe error message extractor ────────────────────
    // API might return message as string, object, or array
    const extractErrorMsg = (err, fallback) => {
        const msg = err?.response?.data?.message
        if (typeof msg === 'string') return msg
        if (typeof msg === 'object' && msg !== null) return JSON.stringify(msg)
        return fallback
    }

    // ══════════════════════════════════════════════════════
    // STEP 1: Check User / Send OTP
    // ══════════════════════════════════════════════════════

    const handleIdentifierSubmit = useCallback(async (e) => {
        e.preventDefault()

        dispatch({ type: 'SET_FIELD', field: 'identifierTouched', value: true })

        const error = validateIdentifier(state.identifier)
        dispatch({ type: 'SET_FIELD', field: 'identifierError', value: error })
        if (error) {
            identifierRef.current?.focus()
            return
        }

        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })

            const res = await axios.post(
                `${API}/api/check-user-otp`,
                { identifier: state.identifier.trim() },
                { withCredentials: true }
            )

            const message = res.data?.message || ''

            if (message.toLowerCase().includes('already verified')) {
                // User already verified → go straight to set password
                dispatch({ type: 'GOTO_SET_PASSWORD' })
                topTost?.('success', 'Account verified. Please set your password.')
            } else {
                // OTP sent → go to OTP step
                dispatch({ type: 'GOTO_OTP' })
                topTost?.('success', 'OTP sent to your registered email.')
            }
        } catch (err) {
            console.error('Check user OTP failed:', err)
            const msg = extractErrorMsg(err, 'Something went wrong. Please try again.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.identifier, API])

    // ══════════════════════════════════════════════════════
    // STEP 2: Verify OTP
    // ══════════════════════════════════════════════════════

    const handleOtpSubmit = useCallback(async (e) => {
        e.preventDefault()

        dispatch({ type: 'SET_FIELD', field: 'otpTouched', value: true })

        const error = validateOtp(state.otp)
        dispatch({ type: 'SET_FIELD', field: 'otpError', value: error })
        if (error) {
            otpRef.current?.focus()
            return
        }

        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })

            await axios.post(
                `${API}/api/verify-otp`,
                {
                    identifier: state.identifier.trim(),
                    otp: state.otp.trim(),
                },
                { withCredentials: true }
            )

            topTost?.('success', 'Email verified successfully!')
            dispatch({ type: 'GOTO_SET_PASSWORD' })
        } catch (err) {
            console.error('OTP verification failed:', err)
            const msg = err?.response?.data?.message || 'OTP verification failed. Please try again.'
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.identifier, state.otp, API])

    // ── Resend OTP ──────────────────────────────────────
    const handleResendOtp = useCallback(async () => {
        if (state.resendCooldown > 0 || state.isSubmitting) return

        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })
            dispatch({ type: 'SET_FIELDS', fields: { otp: '', otpError: '', otpTouched: false } })

            await axios.post(
                `${API}/api/check-user-otp`,
                { identifier: state.identifier.trim() },
                { withCredentials: true }
            )

            dispatch({ type: 'RESET_COOLDOWN' })
            dispatch({ type: 'SET_SUBMITTING', value: false })
            topTost?.('success', 'New OTP sent to your email.')
            otpRef.current?.focus()
        } catch (err) {
            console.error('Resend OTP failed:', err)
            const msg = err?.response?.data?.message || 'Failed to resend OTP.'
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.identifier, state.resendCooldown, state.isSubmitting, API])

    // ══════════════════════════════════════════════════════
    // STEP 3: Set Password
    // ══════════════════════════════════════════════════════

    const handlePasswordSubmit = useCallback(async (e) => {
        e.preventDefault()

        dispatch({
            type: 'SET_FIELDS',
            fields: { passwordTouched: true, confirmPasswordTouched: true },
        })

        const pwError = validatePassword(state.password)
        const cpError = validateConfirmPassword(state.password, state.confirmPassword)

        dispatch({
            type: 'SET_FIELDS',
            fields: { passwordError: pwError, confirmPasswordError: cpError },
        })

        if (pwError) {
            passwordRef.current?.focus()
            return
        }
        if (cpError) {
            confirmPasswordRef.current?.focus()
            return
        }

        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })

            const res = await axios.post(
                `${API}/api/set-password`,
                {
                    identifier: state.identifier.trim(),
                    password: state.password,
                },
                { withCredentials: true }
            )

            topTost?.('success', 'Password set successfully!')

            // If the API returns user data, store it and redirect
            if (res.data?.user) {
                loginStore(res.data.user)
                router.push('/')
            } else {
                // Otherwise reset to identifier step for normal login
                dispatch({ type: 'GOTO_IDENTIFIER' })
                topTost?.('info', 'Please login with your new password.')
            }
        } catch (err) {
            console.error('Set password failed:', err)
            const msg = err?.response?.data?.message || 'Failed to set password. Please try again.'
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        } finally {
            dispatch({ type: 'SET_SUBMITTING', value: false })
        }
    }, [state.identifier, state.password, state.confirmPassword, API, loginStore, router])

    // ══════════════════════════════════════════════════════
    // FIELD CHANGE HANDLERS
    // ══════════════════════════════════════════════════════

    const handleIdentifierChange = (value) => {
        dispatch({ type: 'SET_FIELD', field: 'identifier', value })
        if (state.identifierTouched) {
            dispatch({ type: 'SET_FIELD', field: 'identifierError', value: validateIdentifier(value) })
        }
    }

    const handleOtpChange = (value) => {
        // Only allow digits
        const digits = value.replace(/\D/g, '').slice(0, 8)
        dispatch({ type: 'SET_FIELD', field: 'otp', value: digits })
        if (state.otpTouched) {
            dispatch({ type: 'SET_FIELD', field: 'otpError', value: validateOtp(digits) })
        }
    }

    const handlePasswordChange = (value) => {
        dispatch({ type: 'SET_FIELD', field: 'password', value })
        if (state.passwordTouched) {
            dispatch({ type: 'SET_FIELD', field: 'passwordError', value: validatePassword(value) })
        }
        // Also revalidate confirm if it's been touched
        if (state.confirmPasswordTouched) {
            dispatch({
                type: 'SET_FIELD',
                field: 'confirmPasswordError',
                value: validateConfirmPassword(value, state.confirmPassword),
            })
        }
    }

    const handleConfirmPasswordChange = (value) => {
        dispatch({ type: 'SET_FIELD', field: 'confirmPassword', value })
        if (state.confirmPasswordTouched) {
            dispatch({
                type: 'SET_FIELD',
                field: 'confirmPasswordError',
                value: validateConfirmPassword(state.password, value),
            })
        }
    }

    // ══════════════════════════════════════════════════════
    // STEP INDICATOR
    // ══════════════════════════════════════════════════════

    const stepNumber = state.step === STEPS.IDENTIFIER ? 1 : state.step === STEPS.OTP ? 2 : 3

    const StepIndicator = () => (
        <div className="d-flex align-items-center justify-content-center gap-2 mb-4">
            {[1, 2, 3].map((num) => (
                <React.Fragment key={num}>
                    <div
                        className="d-flex align-items-center justify-content-center rounded-circle"
                        style={{
                            width: 28,
                            height: 28,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            transition: 'all 0.3s ease',
                            background: num < stepNumber ? '#10b981' : num === stepNumber ? '#4f46e5' : '#e5e7eb',
                            color: num <= stepNumber ? '#fff' : '#9ca3af',
                        }}
                    >
                        {num < stepNumber ? '✓' : num}
                    </div>
                    {num < 3 && (
                        <div
                            style={{
                                width: 40,
                                height: 2,
                                borderRadius: 1,
                                transition: 'all 0.3s ease',
                                background: num < stepNumber ? '#10b981' : '#e5e7eb',
                            }}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    )

    // ══════════════════════════════════════════════════════
    // API ERROR BANNER
    // ══════════════════════════════════════════════════════

    const ErrorBanner = () =>
        state.apiError ? (
            <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3" role="alert">
                <span className="me-2">⚠</span>
                <span className="fs-12 flex-grow-1">{state.apiError}</span>
                <button
                    type="button"
                    className="btn-close btn-close-sm ms-2"
                    style={{ fontSize: '0.6rem' }}
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'apiError', value: '' })}
                />
            </div>
        ) : null

    // ══════════════════════════════════════════════════════
    // SUBMIT BUTTON HELPER
    // ══════════════════════════════════════════════════════

    const SubmitButton = ({ label, loadingLabel }) => (
        <button
            type="submit"
            className="btn btn-lg btn-primary w-100"
            disabled={state.isSubmitting}
        >
            {state.isSubmitting ? (
                <span className="d-flex align-items-center justify-content-center gap-2">
                    <RotatingLines
                        visible={true}
                        height="24"
                        width="24"
                        color="white"
                        strokeWidth="5"
                        animationDuration="0.75"
                    />
                    {loadingLabel}
                </span>
            ) : (
                label
            )}
        </button>
    )

    // ══════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════

    return (
        <>
            <h2 className="fs-20 fw-bolder mb-4 d-flex justify-content-center">
                {state.step === STEPS.IDENTIFIER && 'Login'}
                {state.step === STEPS.OTP && 'Verify OTP'}
                {state.step === STEPS.SET_PASSWORD && 'Set Password'}
            </h2>

            <StepIndicator />

            {/* ── Step subtitle ───────────────────────────── */}
            <div className="text-center mb-4">
                {state.step === STEPS.IDENTIFIER && (
                    <>
                        <h4 className="fs-13 fw-bold mb-1">Login to your account</h4>
                        <p className="fs-12 fw-medium text-muted mb-0">
                            Enter your email or username to get started.
                        </p>
                    </>
                )}
                {state.step === STEPS.OTP && (
                    <>
                        <h4 className="fs-13 fw-bold mb-1">Check your email</h4>
                        <p className="fs-12 fw-medium text-muted mb-0">
                            We sent a verification code to <strong>{state.identifier}</strong>
                        </p>
                    </>
                )}
                {state.step === STEPS.SET_PASSWORD && (
                    <>
                        <h4 className="fs-13 fw-bold mb-1">Create your password</h4>
                        <p className="fs-12 fw-medium text-muted mb-0">
                            Set a secure password for <strong>{state.identifier}</strong>
                        </p>
                    </>
                )}
            </div>

            <ErrorBanner />

            {/* ══════════════════════════════════════════════
                STEP 1: IDENTIFIER
               ══════════════════════════════════════════════ */}
            {state.step === STEPS.IDENTIFIER && (
                <form onSubmit={handleIdentifierSubmit} className="w-100" noValidate>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">Email or Username</label>
                        <input
                            ref={identifierRef}
                            type="text"
                            className={`form-control ${
                                state.identifierTouched
                                    ? state.identifierError
                                        ? 'is-invalid'
                                        : 'is-valid'
                                    : ''
                            }`}
                            placeholder="Enter your email or username"
                            value={state.identifier}
                            onChange={(e) => handleIdentifierChange(e.target.value)}
                            onBlur={() => {
                                dispatch({ type: 'SET_FIELD', field: 'identifierTouched', value: true })
                                dispatch({ type: 'SET_FIELD', field: 'identifierError', value: validateIdentifier(state.identifier) })
                            }}
                            disabled={state.isSubmitting}
                            autoComplete="username"
                            autoFocus
                        />
                        {state.identifierTouched && state.identifierError && (
                            <div className="invalid-feedback">{state.identifierError}</div>
                        )}
                    </div>

                    <div className="mt-4">
                        <SubmitButton label="Continue" loadingLabel="Checking..." />
                    </div>
                </form>
            )}

            {/* ══════════════════════════════════════════════
                STEP 2: OTP VERIFICATION
               ══════════════════════════════════════════════ */}
            {state.step === STEPS.OTP && (
                <form onSubmit={handleOtpSubmit} className="w-100" noValidate>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">Verification Code</label>
                        <input
                            ref={otpRef}
                            type="text"
                            inputMode="numeric"
                            className={`form-control text-center fw-bold fs-16 ${
                                state.otpTouched
                                    ? state.otpError
                                        ? 'is-invalid'
                                        : 'is-valid'
                                    : ''
                            }`}
                            placeholder="Enter OTP"
                            value={state.otp}
                            onChange={(e) => handleOtpChange(e.target.value)}
                            onBlur={() => {
                                dispatch({ type: 'SET_FIELD', field: 'otpTouched', value: true })
                                dispatch({ type: 'SET_FIELD', field: 'otpError', value: validateOtp(state.otp) })
                            }}
                            disabled={state.isSubmitting}
                            autoComplete="one-time-code"
                            style={{ letterSpacing: '0.5em' }}
                        />
                        {state.otpTouched && state.otpError && (
                            <div className="invalid-feedback">{state.otpError}</div>
                        )}
                    </div>

                    <div className="mt-4">
                        <SubmitButton label="Verify OTP" loadingLabel="Verifying..." />
                    </div>

                    {/* Resend OTP */}
                    <div className="text-center mt-3">
                        {state.resendCooldown > 0 ? (
                            <span className="fs-12 text-muted">
                                Resend OTP in <strong>{state.resendCooldown}s</strong>
                            </span>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-sm btn-link text-decoration-none fs-12 p-0"
                                onClick={handleResendOtp}
                                disabled={state.isSubmitting}
                            >
                                Didn't receive a code? <strong>Resend OTP</strong>
                            </button>
                        )}
                    </div>

                    {/* Back to step 1 */}
                    <div className="text-center mt-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-link text-decoration-none text-muted fs-11 p-0"
                            onClick={() => dispatch({ type: 'GOTO_IDENTIFIER' })}
                            disabled={state.isSubmitting}
                        >
                            ← Change email/username
                        </button>
                    </div>
                </form>
            )}

            {/* ══════════════════════════════════════════════
                STEP 3: SET PASSWORD
               ══════════════════════════════════════════════ */}
            {state.step === STEPS.SET_PASSWORD && (
                <form onSubmit={handlePasswordSubmit} className="w-100" noValidate>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">New Password</label>
                        <input
                            ref={passwordRef}
                            type="password"
                            className={`form-control ${
                                state.passwordTouched
                                    ? state.passwordError
                                        ? 'is-invalid'
                                        : 'is-valid'
                                    : ''
                            }`}
                            placeholder="Enter new password"
                            value={state.password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            onBlur={() => {
                                dispatch({ type: 'SET_FIELD', field: 'passwordTouched', value: true })
                                dispatch({ type: 'SET_FIELD', field: 'passwordError', value: validatePassword(state.password) })
                            }}
                            disabled={state.isSubmitting}
                            autoComplete="new-password"
                        />
                        {state.passwordTouched && state.passwordError && (
                            <div className="invalid-feedback">{state.passwordError}</div>
                        )}

                        {/* Password strength hints */}
                        {state.password && (
                            <div className="mt-2 d-flex flex-wrap gap-2">
                                {[
                                    { test: state.password.length >= 6, label: '6+ chars' },
                                    { test: /[A-Z]/.test(state.password), label: 'Uppercase' },
                                    { test: /[a-z]/.test(state.password), label: 'Lowercase' },
                                    { test: /[0-9]/.test(state.password), label: 'Number' },
                                    { test: /[^A-Za-z0-9]/.test(state.password), label: 'Special' },
                                ].map(({ test, label }) => (
                                    <span
                                        key={label}
                                        className={`badge ${test ? 'bg-soft-success text-success' : 'bg-gray-200 text-muted'}`}
                                        style={{ fontSize: '0.65rem', transition: 'all 0.2s ease' }}
                                    >
                                        {test ? '✓' : '○'} {label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">Confirm Password</label>
                        <input
                            ref={confirmPasswordRef}
                            type="password"
                            className={`form-control ${
                                state.confirmPasswordTouched
                                    ? state.confirmPasswordError
                                        ? 'is-invalid'
                                        : 'is-valid'
                                    : ''
                            }`}
                            placeholder="Re-enter your password"
                            value={state.confirmPassword}
                            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                            onBlur={() => {
                                dispatch({ type: 'SET_FIELD', field: 'confirmPasswordTouched', value: true })
                                dispatch({
                                    type: 'SET_FIELD',
                                    field: 'confirmPasswordError',
                                    value: validateConfirmPassword(state.password, state.confirmPassword),
                                })
                            }}
                            disabled={state.isSubmitting}
                            autoComplete="new-password"
                        />
                        {state.confirmPasswordTouched && state.confirmPasswordError && (
                            <div className="invalid-feedback">{state.confirmPasswordError}</div>
                        )}
                    </div>

                    <div className="mt-4">
                        <SubmitButton label="Set Password" loadingLabel="Setting password..." />
                    </div>

                    {/* Back to step 1 */}
                    <div className="text-center mt-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-link text-decoration-none text-muted fs-11 p-0"
                            onClick={() => dispatch({ type: 'GOTO_IDENTIFIER' })}
                            disabled={state.isSubmitting}
                        >
                            ← Start over with a different account
                        </button>
                    </div>
                </form>
            )}

            {/* ── Forgot password link (step 1 only) ─────── */}
            {state.step === STEPS.IDENTIFIER && (
                <div className="d-flex align-items-center justify-content-end mt-3">
                    <Link href={resetPath} className="fs-11 text-primary">
                        Forgot password?
                    </Link>
                </div>
            )}

            {/* ── Register Link ──────────────────────────── */}
            <div className="mt-5 text-muted text-center">
                <span>Don't have an account?</span>
                <Link href={registerPath} className="fw-bold">
                    {' '}Create an Account
                </Link>
            </div>
        </>
    )
}

export default LoginForm