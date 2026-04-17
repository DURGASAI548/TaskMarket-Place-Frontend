'use client'

import Link from 'next/link'
import React, { useReducer, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'



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


const extractErrorMsg = (err, fallback) => {
    const msg = err?.response?.data?.message
    if (typeof msg === 'string') return msg
    if (typeof msg === 'object' && msg !== null) return JSON.stringify(msg)
    return fallback
}



const STEPS = {
    // Login flows
    IDENTIFIER: 'IDENTIFIER',
    LOGIN_PASSWORD: 'LOGIN_PASSWORD',
    OTP: 'OTP',
    SET_PASSWORD: 'SET_PASSWORD',
    // Forgot password flow
    FORGOT_IDENTIFIER: 'FORGOT_IDENTIFIER',
    FORGOT_OTP_PASSWORD: 'FORGOT_OTP_PASSWORD',
}

const OTP_COOLDOWN_SECONDS = 60

const initialState = {
    step: STEPS.IDENTIFIER,
    identifier: '',

    identifierError: '',
    identifierTouched: false,

    loginPassword: '',
    loginPasswordError: '',
    loginPasswordTouched: false,

    otp: '',
    otpError: '',
    otpTouched: false,
    resendCooldown: 0,

    password: '',
    confirmPassword: '',
    passwordError: '',
    confirmPasswordError: '',
    passwordTouched: false,
    confirmPasswordTouched: false,

    forgotIdentifier: '',
    forgotIdentifierError: '',
    forgotIdentifierTouched: false,

    forgotOtp: '',
    forgotOtpError: '',
    forgotOtpTouched: false,
    forgotResendCooldown: 0,

    forgotNewPassword: '',
    forgotNewPasswordError: '',
    forgotNewPasswordTouched: false,

    forgotResetSuccess: false, // show success message before redirecting

    isSubmitting: false,
    apiError: '',
}


const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value, apiError: '' }

        case 'SET_FIELDS':
            return { ...state, ...action.fields, apiError: '' }

        case 'GOTO_LOGIN_PASSWORD':
            return {
                ...state,
                step: STEPS.LOGIN_PASSWORD,
                loginPassword: '', loginPasswordError: '', loginPasswordTouched: false,
                isSubmitting: false, apiError: '',
            }

        case 'GOTO_OTP':
            return {
                ...state,
                step: STEPS.OTP,
                otp: '', otpError: '', otpTouched: false,
                resendCooldown: OTP_COOLDOWN_SECONDS,
                isSubmitting: false, apiError: '',
            }

        case 'GOTO_SET_PASSWORD':
            return {
                ...state,
                step: STEPS.SET_PASSWORD,
                password: '', confirmPassword: '',
                passwordError: '', confirmPasswordError: '',
                passwordTouched: false, confirmPasswordTouched: false,
                isSubmitting: false, apiError: '',
            }

        case 'GOTO_IDENTIFIER':
            return { ...initialState, identifier: state.identifier }

        case 'GOTO_FORGOT_IDENTIFIER':
            return {
                ...state,
                step: STEPS.FORGOT_IDENTIFIER,
                forgotIdentifier: state.identifier || '', // pre-fill from login if available
                forgotIdentifierError: '', forgotIdentifierTouched: false,
                forgotOtp: '', forgotOtpError: '', forgotOtpTouched: false,
                forgotNewPassword: '', forgotNewPasswordError: '', forgotNewPasswordTouched: false,
                forgotResendCooldown: 0, forgotResetSuccess: false,
                isSubmitting: false, apiError: '',
            }

        case 'GOTO_FORGOT_OTP_PASSWORD':
            return {
                ...state,
                step: STEPS.FORGOT_OTP_PASSWORD,
                forgotOtp: '', forgotOtpError: '', forgotOtpTouched: false,
                forgotNewPassword: '', forgotNewPasswordError: '', forgotNewPasswordTouched: false,
                forgotResendCooldown: OTP_COOLDOWN_SECONDS,
                forgotResetSuccess: false,
                isSubmitting: false, apiError: '',
            }

        case 'FORGOT_RESET_SUCCESS':
            return { ...state, forgotResetSuccess: true, isSubmitting: false, apiError: '' }

        case 'GOTO_LOGIN_FROM_FORGOT':
            return {
                ...initialState,
                identifier: state.forgotIdentifier || state.identifier,
            }

        case 'SET_SUBMITTING':
            return { ...state, isSubmitting: action.value }

        case 'SET_API_ERROR':
            return { ...state, apiError: action.value, isSubmitting: false }

        case 'TICK_COOLDOWN':
            return { ...state, resendCooldown: Math.max(0, state.resendCooldown - 1) }

        case 'RESET_COOLDOWN':
            return { ...state, resendCooldown: OTP_COOLDOWN_SECONDS }

        case 'TICK_FORGOT_COOLDOWN':
            return { ...state, forgotResendCooldown: Math.max(0, state.forgotResendCooldown - 1) }

        case 'RESET_FORGOT_COOLDOWN':
            return { ...state, forgotResendCooldown: OTP_COOLDOWN_SECONDS }

        default:
            return state
    }
}



const LoginForm = ({ registerPath, resetPath }) => {
    const loginStore = useAuthStore((s) => s.login)
    const router = useRouter()
    const [state, dispatch] = useReducer(reducer, initialState)

    // Refs
    const identifierRef = useRef(null)
    const loginPasswordRef = useRef(null)
    const otpRef = useRef(null)
    const passwordRef = useRef(null)
    const confirmPasswordRef = useRef(null)
    const forgotIdentifierRef = useRef(null)
    const forgotOtpRef = useRef(null)
    const forgotPasswordRef = useRef(null)

    const API = process.env.NEXT_PUBLIC_API_URL

    const isLoginSetupFlow = state.step === STEPS.OTP || state.step === STEPS.SET_PASSWORD
    const isForgotFlow = state.step === STEPS.FORGOT_IDENTIFIER || state.step === STEPS.FORGOT_OTP_PASSWORD

    useEffect(() => {
        if (state.step === STEPS.OTP && state.resendCooldown > 0) {
            const t = setInterval(() => dispatch({ type: 'TICK_COOLDOWN' }), 1000)
            return () => clearInterval(t)
        }
    }, [state.step, state.resendCooldown])

    useEffect(() => {
        if (state.step === STEPS.FORGOT_OTP_PASSWORD && state.forgotResendCooldown > 0) {
            const t = setInterval(() => dispatch({ type: 'TICK_FORGOT_COOLDOWN' }), 1000)
            return () => clearInterval(t)
        }
    }, [state.step, state.forgotResendCooldown])

    useEffect(() => {
        const t = setTimeout(() => {
            switch (state.step) {
                case STEPS.IDENTIFIER: identifierRef.current?.focus(); break
                case STEPS.LOGIN_PASSWORD: loginPasswordRef.current?.focus(); break
                case STEPS.OTP: otpRef.current?.focus(); break
                case STEPS.SET_PASSWORD: passwordRef.current?.focus(); break
                case STEPS.FORGOT_IDENTIFIER: forgotIdentifierRef.current?.focus(); break
                case STEPS.FORGOT_OTP_PASSWORD: forgotOtpRef.current?.focus(); break
            }
        }, 100)
        return () => clearTimeout(t)
    }, [state.step])

    useEffect(() => {
        if (state.forgotResetSuccess) {
            const t = setTimeout(() => {
                dispatch({ type: 'GOTO_LOGIN_FROM_FORGOT' })
            }, 3000)
            return () => clearTimeout(t)
        }
    }, [state.forgotResetSuccess])


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
                dispatch({ type: 'GOTO_LOGIN_PASSWORD' })
            } else {
                dispatch({ type: 'GOTO_OTP' })
                topTost?.('success', 'OTP sent to your registered email.')
            }
        } catch (err) {
            const msg = extractErrorMsg(err, 'Something went wrong. Please try again.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.identifier, API])


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
                { identifier: state.identifier.trim(), password: state.loginPassword },
                { withCredentials: true }
            )
            loginStore(res.data.user)
            router.push('/')
        } catch (err) {
            const msg = extractErrorMsg(err, 'Login failed. Please check your credentials.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.identifier, state.loginPassword, API, loginStore, router])


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
            const msg = extractErrorMsg(err, 'OTP verification failed.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.identifier, state.otp, API])

    const handleResendLoginOtp = useCallback(async () => {
        if (state.resendCooldown > 0 || state.isSubmitting) return
        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })
            dispatch({ type: 'SET_FIELDS', fields: { otp: '', otpError: '', otpTouched: false } })
            await axios.post(`${API}/api/check-user-otp`, { identifier: state.identifier.trim() }, { withCredentials: true })
            dispatch({ type: 'RESET_COOLDOWN' })
            dispatch({ type: 'SET_SUBMITTING', value: false })
            topTost?.('success', 'New OTP sent.')
            otpRef.current?.focus()
        } catch (err) {
            const msg = extractErrorMsg(err, 'Failed to resend OTP.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.identifier, state.resendCooldown, state.isSubmitting, API])


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
                dispatch({ type: 'GOTO_LOGIN_PASSWORD' })
            }
        } catch (err) {
            const msg = extractErrorMsg(err, 'Failed to set password.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        } finally {
            dispatch({ type: 'SET_SUBMITTING', value: false })
        }
    }, [state.identifier, state.password, state.confirmPassword, API, loginStore, router])


    const handleForgotIdentifierSubmit = useCallback(async (e) => {
        e.preventDefault()
        dispatch({ type: 'SET_FIELD', field: 'forgotIdentifierTouched', value: true })

        const error = validateIdentifier(state.forgotIdentifier)
        dispatch({ type: 'SET_FIELD', field: 'forgotIdentifierError', value: error })
        if (error) { forgotIdentifierRef.current?.focus(); return }

        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })

            await axios.post(
                `${API}/api/reset-password-otp`,
                { identifier: state.forgotIdentifier.trim() },
                { withCredentials: true }
            )

            topTost?.('success', 'OTP sent to your registered email.')
            dispatch({ type: 'GOTO_FORGOT_OTP_PASSWORD' })
        } catch (err) {
            const msg = extractErrorMsg(err, 'Failed to send reset OTP.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.forgotIdentifier, API])


    const handleForgotResetSubmit = useCallback(async (e) => {
        e.preventDefault()
        dispatch({
            type: 'SET_FIELDS',
            fields: { forgotOtpTouched: true, forgotNewPasswordTouched: true },
        })

        const otpErr = validateOtp(state.forgotOtp)
        const pwErr = validatePassword(state.forgotNewPassword)
        dispatch({
            type: 'SET_FIELDS',
            fields: { forgotOtpError: otpErr, forgotNewPasswordError: pwErr },
        })

        if (otpErr) { forgotOtpRef.current?.focus(); return }
        if (pwErr) { forgotPasswordRef.current?.focus(); return }

        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })

            await axios.post(
                `${API}/api/reset-password`,
                {
                    identifier: state.forgotIdentifier.trim(),
                    otp: state.forgotOtp.trim(),
                    newPassword: state.forgotNewPassword,
                },
                { withCredentials: true }
            )

            topTost?.('success', 'Password reset successful! Redirecting to login...')
            dispatch({ type: 'FORGOT_RESET_SUCCESS' })
        } catch (err) {
            const msg = extractErrorMsg(err, 'Password reset failed.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.forgotIdentifier, state.forgotOtp, state.forgotNewPassword, API])

    const handleResendForgotOtp = useCallback(async () => {
        if (state.forgotResendCooldown > 0 || state.isSubmitting) return
        try {
            dispatch({ type: 'SET_SUBMITTING', value: true })
            dispatch({ type: 'SET_FIELDS', fields: { forgotOtp: '', forgotOtpError: '', forgotOtpTouched: false } })

            await axios.post(
                `${API}/api/reset-password-otp`,
                { identifier: state.forgotIdentifier.trim() },
                { withCredentials: true }
            )

            dispatch({ type: 'RESET_FORGOT_COOLDOWN' })
            dispatch({ type: 'SET_SUBMITTING', value: false })
            topTost?.('success', 'New OTP sent to your email.')
            forgotOtpRef.current?.focus()
        } catch (err) {
            const msg = extractErrorMsg(err, 'Failed to resend OTP.')
            dispatch({ type: 'SET_API_ERROR', value: msg })
            topTost?.('error', msg)
        }
    }, [state.forgotIdentifier, state.forgotResendCooldown, state.isSubmitting, API])

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

    // Forgot flow
    const handleForgotIdentifierChange = (v) => {
        dispatch({ type: 'SET_FIELD', field: 'forgotIdentifier', value: v })
        if (state.forgotIdentifierTouched)
            dispatch({ type: 'SET_FIELD', field: 'forgotIdentifierError', value: validateIdentifier(v) })
    }

    const handleForgotOtpChange = (v) => {
        const digits = v.replace(/\D/g, '').slice(0, 8)
        dispatch({ type: 'SET_FIELD', field: 'forgotOtp', value: digits })
        if (state.forgotOtpTouched)
            dispatch({ type: 'SET_FIELD', field: 'forgotOtpError', value: validateOtp(digits) })
    }

    const handleForgotNewPasswordChange = (v) => {
        dispatch({ type: 'SET_FIELD', field: 'forgotNewPassword', value: v })
        if (state.forgotNewPasswordTouched)
            dispatch({ type: 'SET_FIELD', field: 'forgotNewPasswordError', value: validatePassword(v) })
    }



    const loginStepNumber = state.step === STEPS.OTP ? 2 : state.step === STEPS.SET_PASSWORD ? 3 : 1

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



    return (
        <>
            <h2 className="fs-20 fw-bolder mb-4 d-flex justify-content-center">
                {state.step === STEPS.IDENTIFIER && 'Login'}
                {state.step === STEPS.LOGIN_PASSWORD && 'Login'}
                {state.step === STEPS.OTP && 'Verify Email'}
                {state.step === STEPS.SET_PASSWORD && 'Set Password'}
                {state.step === STEPS.FORGOT_IDENTIFIER && 'Reset Password'}
                {state.step === STEPS.FORGOT_OTP_PASSWORD && 'Reset Password'}
            </h2>

            {isLoginSetupFlow && (
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
                                        width: 28, height: 28, fontSize: '0.7rem', fontWeight: 700,
                                        transition: 'all 0.3s ease',
                                        background: num < loginStepNumber ? '#10b981' : num === loginStepNumber ? '#4f46e5' : '#e5e7eb',
                                        color: num <= loginStepNumber ? '#fff' : '#9ca3af',
                                    }}
                                >
                                    {num < loginStepNumber ? '✓' : num}
                                </div>
                                <div className="fs-10 text-muted mt-1">{label}</div>
                            </div>
                            {num < 3 && (
                                <div style={{ width: 36, height: 2, borderRadius: 1, marginBottom: 16, transition: 'all 0.3s ease', background: num < loginStepNumber ? '#10b981' : '#e5e7eb' }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}

            <div className="text-center mb-4">
                {state.step === STEPS.IDENTIFIER && (
                    <p className="fs-12 fw-medium text-muted mb-0">Enter your email or username to continue.</p>
                )}
                {state.step === STEPS.LOGIN_PASSWORD && (
                    <p className="fs-12 fw-medium text-muted mb-0">Welcome back, <strong>{state.identifier}</strong></p>
                )}
                {state.step === STEPS.OTP && (
                    <p className="fs-12 fw-medium text-muted mb-0">We sent a code to <strong>{state.identifier}</strong></p>
                )}
                {state.step === STEPS.SET_PASSWORD && (
                    <p className="fs-12 fw-medium text-muted mb-0">Create a password for <strong>{state.identifier}</strong></p>
                )}
                {state.step === STEPS.FORGOT_IDENTIFIER && (
                    <p className="fs-12 fw-medium text-muted mb-0">Enter your email or username to receive a reset code.</p>
                )}
                {state.step === STEPS.FORGOT_OTP_PASSWORD && !state.forgotResetSuccess && (
                    <p className="fs-12 fw-medium text-muted mb-0">
                        Enter the OTP sent to <strong>{state.forgotIdentifier}</strong> and your new password.
                    </p>
                )}
            </div>

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

            {state.step === STEPS.IDENTIFIER && (
                <form onSubmit={handleIdentifierSubmit} className="w-100" noValidate>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">Email or Username</label>
                        <input
                            ref={identifierRef}
                            type="text"
                            className={`form-control ${state.identifierTouched ? (state.identifierError ? 'is-invalid' : '') : ''}`}
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

            {state.step === STEPS.LOGIN_PASSWORD && (
                <form onSubmit={handleLoginSubmit} className="w-100" noValidate>
                    <div className="mb-3">
                        <label className="form-label fs-12 fw-semibold">Account</label>
                        <div className="d-flex align-items-center gap-2 p-2 rounded-2" style={{ background: '#f3f4f6' }}>
                            <span className="fs-13 fw-medium flex-grow-1">{state.identifier}</span>
                            <button type="button" className="btn btn-sm btn-link text-decoration-none p-0 fs-11"
                                onClick={() => dispatch({ type: 'GOTO_IDENTIFIER' })} disabled={state.isSubmitting}>
                                Change
                            </button>
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fs-12 fw-semibold">Password</label>
                        <input
                            ref={loginPasswordRef}
                            type="password"
                            className={`form-control ${state.loginPasswordTouched ? (state.loginPasswordError ? 'is-invalid' : '') : ''}`}
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

                    <div className="d-flex justify-content-end mb-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-link text-decoration-none p-0 fs-11 text-primary"
                            onClick={() => dispatch({ type: 'GOTO_FORGOT_IDENTIFIER' })}
                            disabled={state.isSubmitting}
                        >
                            Forgot password?
                        </button>
                    </div>

                    <SubmitBtn label="Login" loadingLabel="Logging in..." />
                </form>
            )}

            {state.step === STEPS.OTP && (
                <form onSubmit={handleOtpSubmit} className="w-100" noValidate>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">Verification Code</label>
                        <input
                            ref={otpRef} type="text" inputMode="numeric"
                            className={`form-control text-center fw-bold fs-16 ${state.otpTouched ? (state.otpError ? 'is-invalid' : '') : ''}`}
                            placeholder="Enter OTP" value={state.otp}
                            onChange={(e) => handleOtpChange(e.target.value)}
                            onBlur={() => {
                                dispatch({ type: 'SET_FIELD', field: 'otpTouched', value: true })
                                dispatch({ type: 'SET_FIELD', field: 'otpError', value: validateOtp(state.otp) })
                            }}
                            disabled={state.isSubmitting} autoComplete="one-time-code"
                            style={{ letterSpacing: '0.5em' }}
                        />
                        {state.otpTouched && state.otpError && <div className="invalid-feedback">{state.otpError}</div>}
                    </div>
                    <div className="mt-4"><SubmitBtn label="Verify OTP" loadingLabel="Verifying..." /></div>
                    <div className="text-center mt-3">
                        {state.resendCooldown > 0 ? (
                            <span className="fs-12 text-muted">Resend OTP in <strong>{state.resendCooldown}s</strong></span>
                        ) : (
                            <button type="button" className="btn btn-sm btn-link text-decoration-none fs-12 p-0"
                                onClick={handleResendLoginOtp} disabled={state.isSubmitting}>
                                Didn't receive a code? <strong>Resend OTP</strong>
                            </button>
                        )}
                    </div>
                    <div className="text-center mt-3">
                        <button type="button" className="btn btn-sm btn-link text-decoration-none text-muted fs-11 p-0"
                            onClick={() => dispatch({ type: 'GOTO_IDENTIFIER' })} disabled={state.isSubmitting}>
                            ← Change email/username
                        </button>
                    </div>
                </form>
            )}

            {state.step === STEPS.SET_PASSWORD && (
                <form onSubmit={handleSetPasswordSubmit} className="w-100" noValidate>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">New Password</label>
                        <input
                            ref={passwordRef} type="password"
                            className={`form-control ${state.passwordTouched ? (state.passwordError ? 'is-invalid' : '') : ''}`}
                            placeholder="Enter new password" value={state.password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            onBlur={() => {
                                dispatch({ type: 'SET_FIELD', field: 'passwordTouched', value: true })
                                dispatch({ type: 'SET_FIELD', field: 'passwordError', value: validatePassword(state.password) })
                            }}
                            disabled={state.isSubmitting} autoComplete="new-password"
                        />
                        {state.passwordTouched && state.passwordError && <div className="invalid-feedback">{state.passwordError}</div>}
                        {state.password && (
                            <div className="mt-2 d-flex flex-wrap gap-2">
                                {[
                                    { test: state.password.length >= 6, label: '6+ chars' },
                                    { test: /[A-Z]/.test(state.password), label: 'Uppercase' },
                                    { test: /[a-z]/.test(state.password), label: 'Lowercase' },
                                    { test: /[0-9]/.test(state.password), label: 'Number' },
                                    { test: /[^A-Za-z0-9]/.test(state.password), label: 'Special' },
                                ].map(({ test, label }) => (
                                    <span key={label} className={`badge ${test ? 'bg-soft-success text-success' : 'bg-gray-200 text-muted'}`}
                                        style={{ fontSize: '0.65rem', transition: 'all 0.2s ease' }}>
                                        {test ? '✓' : '○'} {label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">Confirm Password</label>
                        <input
                            ref={confirmPasswordRef} type="password"
                            className={`form-control ${state.confirmPasswordTouched ? (state.confirmPasswordError ? 'is-invalid' : '') : ''}`}
                            placeholder="Re-enter your password" value={state.confirmPassword}
                            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                            onBlur={() => {
                                dispatch({ type: 'SET_FIELD', field: 'confirmPasswordTouched', value: true })
                                dispatch({ type: 'SET_FIELD', field: 'confirmPasswordError', value: validateConfirmPassword(state.password, state.confirmPassword) })
                            }}
                            disabled={state.isSubmitting} autoComplete="new-password"
                        />
                        {state.confirmPasswordTouched && state.confirmPasswordError && <div className="invalid-feedback">{state.confirmPasswordError}</div>}
                    </div>
                    <SubmitBtn label="Set Password & Continue" loadingLabel="Setting password..." />
                    <div className="text-center mt-3">
                        <button type="button" className="btn btn-sm btn-link text-decoration-none text-muted fs-11 p-0"
                            onClick={() => dispatch({ type: 'GOTO_IDENTIFIER' })} disabled={state.isSubmitting}>
                            ← Start over
                        </button>
                    </div>
                </form>
            )}


            {state.step === STEPS.FORGOT_IDENTIFIER && (
                <form onSubmit={handleForgotIdentifierSubmit} className="w-100" noValidate>
                    <div className="mb-4">
                        <label className="form-label fs-12 fw-semibold">Email or Username</label>
                        <input
                            ref={forgotIdentifierRef}
                            type="text"
                            className={`form-control ${state.forgotIdentifierTouched ? (state.forgotIdentifierError ? 'is-invalid' : '') : ''}`}
                            placeholder="Enter your email or username"
                            value={state.forgotIdentifier}
                            onChange={(e) => handleForgotIdentifierChange(e.target.value)}
                            onBlur={() => {
                                dispatch({ type: 'SET_FIELD', field: 'forgotIdentifierTouched', value: true })
                                dispatch({ type: 'SET_FIELD', field: 'forgotIdentifierError', value: validateIdentifier(state.forgotIdentifier) })
                            }}
                            disabled={state.isSubmitting}
                            autoComplete="username"
                        />
                        {state.forgotIdentifierTouched && state.forgotIdentifierError && (
                            <div className="invalid-feedback">{state.forgotIdentifierError}</div>
                        )}
                    </div>

                    <div className="mt-4">
                        <SubmitBtn label="Send Reset Code" loadingLabel="Sending..." />
                    </div>

                    <div className="text-center mt-4">
                        <button
                            type="button"
                            className="btn btn-sm btn-link text-decoration-none text-muted fs-12 p-0"
                            onClick={() => dispatch({ type: 'GOTO_LOGIN_FROM_FORGOT' })}
                            disabled={state.isSubmitting}
                        >
                            ← Back to Login
                        </button>
                    </div>
                </form>
            )}

            {state.step === STEPS.FORGOT_OTP_PASSWORD && (
                <>
                    {state.forgotResetSuccess ? (
                        <div className="text-center py-4">
                            <div
                                className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                                style={{ width: 56, height: 56, background: '#dcfce7' }}
                            >
                                <span style={{ fontSize: 24 }}>✓</span>
                            </div>
                            <h5 className="fw-bold mb-2">Password Reset Successful!</h5>
                            <p className="text-muted fs-13 mb-3">
                                Your password has been reset. Redirecting to login...
                            </p>
                            <div className="d-flex justify-content-center">
                                <RotatingLines visible height="20" width="20" color="grey" strokeWidth="5" animationDuration="0.75" />
                            </div>
                            <button
                                type="button"
                                className="btn btn-sm btn-primary mt-3"
                                onClick={() => dispatch({ type: 'GOTO_LOGIN_FROM_FORGOT' })}
                            >
                                Go to Login Now
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleForgotResetSubmit} className="w-100" noValidate>
                            {/* Account context */}
                            <div className="mb-3">
                                <div className="d-flex align-items-center gap-2 p-2 rounded-2" style={{ background: '#f3f4f6' }}>
                                    <span className="fs-12 text-muted flex-grow-1">
                                        Resetting password for <strong>{state.forgotIdentifier}</strong>
                                    </span>
                                    <button type="button" className="btn btn-sm btn-link text-decoration-none p-0 fs-11"
                                        onClick={() => dispatch({ type: 'GOTO_FORGOT_IDENTIFIER' })} disabled={state.isSubmitting}>
                                        Change
                                    </button>
                                </div>
                            </div>

                            {/* OTP */}
                            <div className="mb-4">
                                <label className="form-label fs-12 fw-semibold">Verification Code</label>
                                <input
                                    ref={forgotOtpRef} type="text" inputMode="numeric"
                                    className={`form-control text-center fw-bold fs-16 ${state.forgotOtpTouched ? (state.forgotOtpError ? 'is-invalid' : '') : ''}`}
                                    placeholder="Enter OTP" value={state.forgotOtp}
                                    onChange={(e) => handleForgotOtpChange(e.target.value)}
                                    onBlur={() => {
                                        dispatch({ type: 'SET_FIELD', field: 'forgotOtpTouched', value: true })
                                        dispatch({ type: 'SET_FIELD', field: 'forgotOtpError', value: validateOtp(state.forgotOtp) })
                                    }}
                                    disabled={state.isSubmitting} autoComplete="one-time-code"
                                    style={{ letterSpacing: '0.5em' }}
                                />
                                {state.forgotOtpTouched && state.forgotOtpError && <div className="invalid-feedback">{state.forgotOtpError}</div>}
                            </div>

                            <div className="mb-4">
                                <label className="form-label fs-12 fw-semibold">New Password</label>
                                <input
                                    ref={forgotPasswordRef} type="password"
                                    className={`form-control ${state.forgotNewPasswordTouched ? (state.forgotNewPasswordError ? 'is-invalid' : '') : ''}`}
                                    placeholder="Enter new password" value={state.forgotNewPassword}
                                    onChange={(e) => handleForgotNewPasswordChange(e.target.value)}
                                    onBlur={() => {
                                        dispatch({ type: 'SET_FIELD', field: 'forgotNewPasswordTouched', value: true })
                                        dispatch({ type: 'SET_FIELD', field: 'forgotNewPasswordError', value: validatePassword(state.forgotNewPassword) })
                                    }}
                                    disabled={state.isSubmitting} autoComplete="new-password"
                                />
                                {state.forgotNewPasswordTouched && state.forgotNewPasswordError && (
                                    <div className="invalid-feedback">{state.forgotNewPasswordError}</div>
                                )}
                                {state.forgotNewPassword && (
                                    <div className="mt-2 d-flex flex-wrap gap-2">
                                        {[
                                            { test: state.forgotNewPassword.length >= 6, label: '6+ chars' },
                                            { test: /[A-Z]/.test(state.forgotNewPassword), label: 'Uppercase' },
                                            { test: /[a-z]/.test(state.forgotNewPassword), label: 'Lowercase' },
                                            { test: /[0-9]/.test(state.forgotNewPassword), label: 'Number' },
                                            { test: /[^A-Za-z0-9]/.test(state.forgotNewPassword), label: 'Special' },
                                        ].map(({ test, label }) => (
                                            <span key={label} className={`badge ${test ? 'bg-soft-success text-success' : 'bg-gray-200 text-muted'}`}
                                                style={{ fontSize: '0.65rem', transition: 'all 0.2s ease' }}>
                                                {test ? '✓' : '○'} {label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <SubmitBtn label="Reset Password" loadingLabel="Resetting..." />

                            {/* Resend OTP */}
                            <div className="text-center mt-3">
                                {state.forgotResendCooldown > 0 ? (
                                    <span className="fs-12 text-muted">Resend code in <strong>{state.forgotResendCooldown}s</strong></span>
                                ) : (
                                    <button type="button" className="btn btn-sm btn-link text-decoration-none fs-12 p-0"
                                        onClick={handleResendForgotOtp} disabled={state.isSubmitting}>
                                        Didn't receive a code? <strong>Resend OTP</strong>
                                    </button>
                                )}
                            </div>

                            {/* Back to login */}
                            <div className="text-center mt-3">
                                <button type="button" className="btn btn-sm btn-link text-decoration-none text-muted fs-12 p-0"
                                    onClick={() => dispatch({ type: 'GOTO_LOGIN_FROM_FORGOT' })} disabled={state.isSubmitting}>
                                    ← Back to Login
                                </button>
                            </div>
                        </form>
                    )}
                </>
            )}

            {state.step === STEPS.IDENTIFIER && (
                <div className="d-flex align-items-center justify-content-end mt-3">
                    <button
                        type="button"
                        className="btn btn-sm btn-link text-decoration-none p-0 fs-11 text-primary"
                        onClick={() => dispatch({ type: 'GOTO_FORGOT_IDENTIFIER' })}
                    >
                        Forgot password?
                    </button>
                </div>
            )}
        </>
    )
}

export default LoginForm