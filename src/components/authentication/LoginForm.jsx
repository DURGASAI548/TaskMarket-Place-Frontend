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
            return 'Only letters, numbers, dots, hyphens, and underscores'
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
// SAFE ERROR EXTRACTION
// ══════════════════════════════════════════════════════════

const extractErrorMsg = (err, fallback) => {
    const msg = err?.response?.data?.message
    if (typeof msg === 'string') return msg
    if (typeof msg === 'object' && msg !== null) return JSON.stringify(msg)
    return fallback
}

// ══════════════════════════════════════════════════════════
// STEPS — Two possible flows:
//
// Flow A (verified user):   IDENTIFIER → LOGIN_PASSWORD → done
// Flow B (unverified user): IDENTIFIER → OTP → SET_PASSWORD → done
// ══════════════════════════════════════════════════════════

const STEPS = {
    IDENTIFIER: 'IDENTIFIER',
    LOGIN_PASSWORD: 'LOGIN_PASSWORD',  // Already verified → just login
    OTP: 'OTP',                         // Not verified → verify email first
    SET_PASSWORD: 'SET_PASSWORD',       // After OTP → create password
}

const OTP_COOLDOWN_SECONDS = 60

const initialState = {
    step: STEPS.IDENTIFIER,
    identifier: '',

    // Step 1
    identifierError: '',
    identifierTouched: false,

    // Login password (verified user flow)
    loginPassword: '',
    loginPasswordError: '',
    loginPasswordTouched: false,

    // OTP (unverified user flow)
    otp: '',
    otpError: '',
    otpTouched: false,
    resendCooldown: 0,

    // Set password (after OTP)
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

// ══════════════════════════════════════════════════════════
// REDUCER
// ══════════════════════════════════════════════════════════

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value, apiError: '' }

        case 'SET_FIELDS':
            return { ...state, ...action.fields, apiError: '' }

        // ── Step transitions ──────────────────────────
        case 'GOTO_LOGIN_PASSWORD':
            return {
                ...state,
                step: STEPS.LOGIN_PASSWORD,
                loginPassword: '',
                loginPasswordError: '',
                loginPasswordTouched: false,
                isSubmitting: false,
                apiError: '',
            }

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
            return { ...initialState, identifier: state.identifier }

        // ── Loading / errors ──────────────────────────
        case 'SET_SUBMITTING':
            return { ...state, isSubmitting: action.value }

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

    const identifierRef = useRef(null)
    const loginPasswordRef = useRef(null)
    const otpRef = useRef(null)
    const passwordRef = useRef(null)
    const confirmPasswordRef = useRef(null)

    const API = process.env.NEXT_PUBLIC_API_URL

    // Is the user in the "new account" step flow?
    const isSetupFlow = state.step === STEPS.OTP || state.step === STEPS.SET_PASSWORD

    // ── OTP Countdown Timer ─────────────────────────────
    useEffect(() => {
        if (state.step !== STEPS.OTP || state.resendCooldown <= 0) return
        const timer = setInterval(() => dispatch({ type: 'TICK_COOLDOWN' }), 1000)
        return () => clearInterval(timer)
    }, [state.step, state.resendCooldown])

    // ── Auto-focus on step change ───────────────────────
    useEffect(() => {
        const t = setTimeout(() => {
            if (state.step === STEPS.IDENTIFIER) identifierRef.current?.focus()
            else if (state.step === STEPS.LOGIN_PASSWORD) loginPasswordRef.current?.focus()
            else if (state.step === STEPS.OTP) otpRef.current?.focus()
            else if (state.step === STEPS.SET_PASSWORD) passwordRef.current?.focus()
        }, 100)
        return () => clearTimeout(t)
    }, [state.step])

    // ══════════════════════════════════════════════════════
    // STEP 1: Check identifier → decide which flow
    // ══════════════════════════════════════════════════════

    const handleIdentifierSubmit = useCallback(async (e) => {
        e.preventDefault()
        dispatch({ type: 'SET_FIELD', field: 'identifierTouched', value: true })

        const error = validateIdentifier(state.identifier)
        dispatch({ type: 'SET_FIELD', field: 'identifierError', value: error })
        if (error) { identifierRef.current?.focus(); return }

        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })

            const res = await axios.post(
                `${API}/api/check-user-otp`,
                { identifier: state.identifier.trim() },
                { withCredentials: true }
            )

            const rawMsg = res.data?.message
            const message = typeof rawMsg === 'string' ? rawMsg.toLowerCase() : ''

            if (message.includes('already verified')) {
                // ✅ User already has a password → simple login flow
                dispatch({ type: 'GOTO_LOGIN_PASSWORD' })
            } else {
                // 📧 OTP sent → new account setup flow
                dispatch({ type: 'GOTO_OTP' })
                topTost?.('success', 'OTP sent to your registered email.')
            }
        } catch (err) {
            console.error('Check user failed:', err)
            const msg = extractErrorMsg(err, 'Something went wrong. Please try again.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.identifier, API])

    // ══════════════════════════════════════════════════════
    // LOGIN PASSWORD (verified user — simple login)
    // ══════════════════════════════════════════════════════

    const handleLoginSubmit = useCallback(async (e) => {
        e.preventDefault()
        dispatch({ type: 'SET_FIELD', field: 'loginPasswordTouched', value: true })

        const error = validatePassword(state.loginPassword)
        dispatch({ type: 'SET_FIELD', field: 'loginPasswordError', value: error })
        if (error) { loginPasswordRef.current?.focus(); return }

        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })

            const res = await axios.post(
                `${API}/api/login`,
                {
                    identifier: state.identifier.trim(),
                    password: state.loginPassword,
                },
                { withCredentials: true }
            )

            loginStore(res.data.user)
            router.push('/')
        } catch (err) {
            console.error('Login failed:', err)
            const msg = extractErrorMsg(err, 'Login failed. Please check your credentials.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.identifier, state.loginPassword, API, loginStore, router])

    // ══════════════════════════════════════════════════════
    // STEP 2: Verify OTP (unverified user flow)
    // ══════════════════════════════════════════════════════

    const handleOtpSubmit = useCallback(async (e) => {
        e.preventDefault()
        dispatch({ type: 'SET_FIELD', field: 'otpTouched', value: true })

        const error = validateOtp(state.otp)
        dispatch({ type: 'SET_FIELD', field: 'otpError', value: error })
        if (error) { otpRef.current?.focus(); return }

        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })

            await axios.post(
                `${API}/api/verify-otp`,
                { identifier: state.identifier.trim(), otp: state.otp.trim() },
                { withCredentials: true }
            )

            topTost?.('success', 'Email verified successfully!')
            dispatch({ type: 'GOTO_SET_PASSWORD' })
        } catch (err) {
            console.error('OTP verification failed:', err)
            const msg = extractErrorMsg(err, 'OTP verification failed. Please try again.')
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
            const msg = extractErrorMsg(err, 'Failed to resend OTP.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.identifier, state.resendCooldown, state.isSubmitting, API])

    // ══════════════════════════════════════════════════════
    // STEP 3: Set Password (after OTP verification)
    // ══════════════════════════════════════════════════════

    const handleSetPasswordSubmit = useCallback(async (e) => {
        e.preventDefault()
        dispatch({ type: 'SET_FIELDS', fields: { passwordTouched: true, confirmPasswordTouched: true } })

        const pwErr = validatePassword(state.password)
        const cpErr = validateConfirmPassword(state.password, state.confirmPassword)
        dispatch({ type: 'SET_FIELDS', fields: { passwordError: pwErr, confirmPasswordError: cpErr } })

        if (pwErr) { passwordRef.current?.focus(); return }
        if (cpErr) { confirmPasswordRef.current?.focus(); return }

        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })

            const res = await axios.post(
                `${API}/api/set-password`,
                { identifier: state.identifier.trim(), password: state.password },
                { withCredentials: true }
            )

            topTost?.('success', 'Password set successfully!')

            if (res.data?.user) {
                loginStore(res.data.user)
                router.push('/')
            } else {
                // Go to login password step so they can login immediately
                dispatch({ type: 'GOTO_LOGIN_PASSWORD' })
                topTost?.('success', 'Now login with your new password.')
            }
        } catch (err) {
            console.error('Set password failed:', err)
            const msg = extractErrorMsg(err, 'Failed to set password. Please try again.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        } finally {
            dispatch({ type: 'SET_SUBMITTING', value: false })
        }
    }, [state.identifier, state.password, state.confirmPassword, API, loginStore, router])

    // ══════════════════════════════════════════════════════
    // FIELD CHANGE HANDLERS
    // ══════════════════════════════════════════════════════

    const handleIdentifierChange = (v) => {
        dispatch({ type: 'SET_FIELD', field: 'identifier', value: v })
        if (state.identifierTouched)
            dispatch({ type: 'SET_FIELD', field: 'identifierError', value: validateIdentifier(v) })
    }

    const handleLoginPasswordChange = (v) => {
        dispatch({ type: 'SET_FIELD', field: 'loginPassword', value: v })
        if (state.loginPasswordTouched)
            dispatch({ type: 'SET_FIELD', field: 'loginPasswordError', value: validatePassword(v) })
    }

    const handleOtpChange = (v) => {
        const digits = v.replace(/\D/g, '').slice(0, 8)
        dispatch({ type: 'SET_FIELD', field: 'otp', value: digits })
        if (state.otpTouched)
            dispatch({ type: 'SET_FIELD', field: 'otpError', value: validateOtp(digits) })
    }

    const handlePasswordChange = (v) => {
        dispatch({ type: 'SET_FIELD', field: 'password', value: v })
        if (state.passwordTouched)
            dispatch({ type: 'SET_FIELD', field: 'passwordError', value: validatePassword(v) })
        if (state.confirmPasswordTouched)
            dispatch({ type: 'SET_FIELD', field: 'confirmPasswordError', value: validateConfirmPassword(v, state.confirmPassword) })
    }

    const handleConfirmPasswordChange = (v) => {
        dispatch({ type: 'SET_FIELD', field: 'confirmPassword', value: v })
        if (state.confirmPasswordTouched)
            dispatch({ type: 'SET_FIELD', field: 'confirmPasswordError', value: validateConfirmPassword(state.password, v) })
    }

    // ══════════════════════════════════════════════════════
    // UI HELPERS
    // ══════════════════════════════════════════════════════

    const stepNumber = state.step === STEPS.OTP ? 2 : state.step === STEPS.SET_PASSWORD ? 3 : 1

    const SubmitBtn = ({ label, loadingLabel }) => (
        <button type="submit" className="btn btn-lg btn-primary w-100" disabled={state.isSubmitting}>
            {state.isSubmitting ? (
                <span className="d-flex align-items-center justify-content-center gap-2">
                    <RotatingLines visible height="24" width="24" color="white" strokeWidth="5" animationDuration="0.75" />
                    {loadingLabel}
                </span>
            ) : label}
        </button>
    )

    // ══════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════

    return (
        <>
            {/* ── Title ───────────────────────────────────── */}
            <h2 className="fs-20 fw-bolder mb-4 d-flex justify-content-center">
                {state.step === STEPS.IDENTIFIER && 'Login'}
                {state.step === STEPS.LOGIN_PASSWORD && 'Login'}
                {state.step === STEPS.OTP && 'Verify Email'}
                {state.step === STEPS.SET_PASSWORD && 'Set Password'}
            </h2>

            {/* ── Step indicator (only for setup flow) ────── */}
            {isSetupFlow && (
                <div className="d-flex align-items-center justify-content-center gap-2 mb-4">
                    {[
                        { num: 1, label: 'Email' },
                        { num: 2, label: 'Verify' },
                        { num: 3, label: 'Password' },
                    ].map(({ num, label }) => (
                        <React.Fragment key={num}>
                            <div className="text-center">
                                <div
                                    className="d-flex align-items-center justify-content-center rounded-circle mx-auto"
                                    style={{
                                        width: 28, height: 28,
                                        fontSize: '0.7rem', fontWeight: 700,
                                        transition: 'all 0.3s ease',
                                        background: num < stepNumber ? '#10b981' : num === stepNumber ? '#4f46e5' : '#e5e7eb',
                                        color: num <= stepNumber ? '#fff' : '#9ca3af',
                                    }}
                                >
                                    {num < stepNumber ? '✓' : num}
                                </div>
                                <div className="fs-10 text-muted mt-1">{label}</div>
                            </div>
                            {num < 3 && (
                                <div
                                    style={{
                                        width: 36, height: 2, borderRadius: 1, marginBottom: 16,
                                        transition: 'all 0.3s ease',
                                        background: num < stepNumber ? '#10b981' : '#e5e7eb',
                                    }}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* ── Subtitle ────────────────────────────────── */}
            <div className="text-center mb-4">
                {state.step === STEPS.IDENTIFIER && (
                    <p className="fs-12 fw-medium text-muted mb-0">Enter your email or username to continue.</p>
                )}
                {state.step === STEPS.LOGIN_PASSWORD && (
                    <p className="fs-12 fw-medium text-muted mb-0">
                        Welcome back, <strong>{state.identifier}</strong>
                    </p>
                )}
                {state.step === STEPS.OTP && (
                    <p className="fs-12 fw-medium text-muted mb-0">
                        We sent a code to <strong>{state.identifier}</strong>
                    </p>
                )}
                {state.step === STEPS.SET_PASSWORD && (
                    <p className="fs-12 fw-medium text-muted mb-0">
                        Create a password for <strong>{state.identifier}</strong>
                    </p>
                )}
            </div>

            {/* ── API Error Banner ────────────────────────── */}
            {state.apiError && (
                <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3" role="alert">
                    <span className="me-2">⚠</span>
                    <span className="fs-12 flex-grow-1">
                        {typeof state.apiError === 'string' ? state.apiError : 'Something went wrong.'}
                    </span>
                    <button
                        type="button"
                        className="btn-close btn-close-sm ms-2"
                        style={{ fontSize: '0.6rem' }}
                        onClick={() => dispatch({ type: 'SET_FIELD', field: 'apiError', value: '' })}
                    />
                </div>
            )}

            {/* ══════════════════════════════════════════════
                STEP: IDENTIFIER
               ══════════════════════════════════════════════ */}
            {state.step === STEPS.IDENTIFIER && (
                <form onSubmit={handleIdentifierSubmit} className="w-100" noValidate>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">Email or Username</label>
                        <input
                            ref={identifierRef}
                            type="text"
                            className={`form-control ${state.identifierTouched ? (state.identifierError ? 'is-invalid' : 'is-valid') : ''}`}
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
                        <SubmitBtn label="Continue" loadingLabel="Checking..." />
                    </div>
                </form>
            )}

            {/* ══════════════════════════════════════════════
                LOGIN PASSWORD (verified user — simple login)
               ══════════════════════════════════════════════ */}
            {state.step === STEPS.LOGIN_PASSWORD && (
                <form onSubmit={handleLoginSubmit} className="w-100" noValidate>
                    {/* Show identifier as read-only context */}
                    <div className="mb-3">
                        <label className="form-label fs-12 fw-semibold">Account</label>
                        <div className="d-flex align-items-center gap-2 p-2 rounded-2" style={{ background: '#f3f4f6' }}>
                            <span className="fs-13 fw-medium flex-grow-1">{state.identifier}</span>
                            <button
                                type="button"
                                className="btn btn-sm btn-link text-decoration-none p-0 fs-11"
                                onClick={() => dispatch({ type: 'GOTO_IDENTIFIER' })}
                                disabled={state.isSubmitting}
                            >
                                Change
                            </button>
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fs-12 fw-semibold">Password</label>
                        <input
                            ref={loginPasswordRef}
                            type="password"
                            className={`form-control ${state.loginPasswordTouched ? (state.loginPasswordError ? 'is-invalid' : 'is-valid') : ''}`}
                            placeholder="Enter your password"
                            value={state.loginPassword}
                            onChange={(e) => handleLoginPasswordChange(e.target.value)}
                            onBlur={() => {
                                dispatch({ type: 'SET_FIELD', field: 'loginPasswordTouched', value: true })
                                dispatch({ type: 'SET_FIELD', field: 'loginPasswordError', value: validatePassword(state.loginPassword) })
                            }}
                            disabled={state.isSubmitting}
                            autoComplete="current-password"
                        />
                        {state.loginPasswordTouched && state.loginPasswordError && (
                            <div className="invalid-feedback">{state.loginPasswordError}</div>
                        )}
                    </div>

                    {/* Forgot password */}
                    <div className="d-flex justify-content-end mb-3">
                        <Link href={resetPath} className="fs-11 text-primary">Forgot password?</Link>
                    </div>

                    <SubmitBtn label="Login" loadingLabel="Logging in..." />
                </form>
            )}

            {/* ══════════════════════════════════════════════
                OTP VERIFICATION (unverified user flow)
               ══════════════════════════════════════════════ */}
            {state.step === STEPS.OTP && (
                <form onSubmit={handleOtpSubmit} className="w-100" noValidate>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">Verification Code</label>
                        <input
                            ref={otpRef}
                            type="text"
                            inputMode="numeric"
                            className={`form-control text-center fw-bold fs-16 ${state.otpTouched ? (state.otpError ? 'is-invalid' : 'is-valid') : ''}`}
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
                        <SubmitBtn label="Verify OTP" loadingLabel="Verifying..." />
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

                    {/* Back */}
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
                SET PASSWORD (after OTP — new account setup)
               ══════════════════════════════════════════════ */}
            {state.step === STEPS.SET_PASSWORD && (
                <form onSubmit={handleSetPasswordSubmit} className="w-100" noValidate>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">New Password</label>
                        <input
                            ref={passwordRef}
                            type="password"
                            className={`form-control ${state.passwordTouched ? (state.passwordError ? 'is-invalid' : 'is-valid') : ''}`}
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

                        {/* Strength hints */}
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
                            className={`form-control ${state.confirmPasswordTouched ? (state.confirmPasswordError ? 'is-invalid' : 'is-valid') : ''}`}
                            placeholder="Re-enter your password"
                            value={state.confirmPassword}
                            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                            onBlur={() => {
                                dispatch({ type: 'SET_FIELD', field: 'confirmPasswordTouched', value: true })
                                dispatch({ type: 'SET_FIELD', field: 'confirmPasswordError', value: validateConfirmPassword(state.password, state.confirmPassword) })
                            }}
                            disabled={state.isSubmitting}
                            autoComplete="new-password"
                        />
                        {state.confirmPasswordTouched && state.confirmPasswordError && (
                            <div className="invalid-feedback">{state.confirmPasswordError}</div>
                        )}
                    </div>

                    <SubmitBtn label="Set Password & Continue" loadingLabel="Setting password..." />

                    <div className="text-center mt-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-link text-decoration-none text-muted fs-11 p-0"
                            onClick={() => dispatch({ type: 'GOTO_IDENTIFIER' })}
                            disabled={state.isSubmitting}
                        >
                            ← Start over
                        </button>
                    </div>
                </form>
            )}

            {/* ── Forgot password (step 1 only) ──────────── */}
            {state.step === STEPS.IDENTIFIER && (
                <div className="d-flex align-items-center justify-content-end mt-3">
                    <Link href={resetPath} className="fs-11 text-primary">Forgot password?</Link>
                </div>
            )}

            {/* ── Register Link ──────────────────────────── */}
            <div className="mt-5 text-muted text-center">
                <span>Don't have an account?</span>
                <Link href={registerPath} className="fw-bold"> Create an Account</Link>
            </div>
        </>
    )
}

export default LoginForm