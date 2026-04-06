'use client'

import Link from 'next/link'
import React, { useState, useRef } from 'react'
import axios from 'axios'
import topTost from '@/utils/topTost';
import { RotatingLines } from 'react-loader-spinner'
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
const validateEmail = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Email or username is required'


    if (trimmed.includes('@')) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
            return 'Enter a valid email address'
        if (trimmed.length > 254)
            return 'Email must be under 254 characters'
    } else {
        // Username validation
        if (trimmed.length < 3)
            return 'Username must be at least 3 characters'
        if (trimmed.length > 50)
            return 'Username must be under 50 characters'
        if (!/^[a-zA-Z0-9._-]+$/.test(trimmed))
            return 'Username can only contain letters, numbers, dots, hyphens, and underscores'
    }

    return ''
}

const validatePassword = (value) => {
    if (!value) return 'Password is required'
    if (value.length < 6) return 'Password must be at least 6 characters'
    if (value.length > 128) return 'Password must be under 128 characters'
    if (/\s/.test(value)) return 'Password must not contain spaces'
    return ''
}


const LoginForm = ({ registerPath, resetPath }) => {
    const loginStore = useAuthStore((state) => state.login);
    const router = useRouter();
    const [formData, setFormData] = useState({
        emailOrUsername: '',
        password: '',
    })


    const [errors, setErrors] = useState({
        emailOrUsername: '',
        password: '',
    })


    const [touched, setTouched] = useState({
        emailOrUsername: false,
        password: false,
    })


    const [isSubmitting, setIsSubmitting] = useState(false)
    const [apiError, setApiError] = useState('')


    const emailRef = useRef(null)
    const passwordRef = useRef(null)



    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        setApiError('')

        if (touched[field]) {
            const error =
                field === 'emailOrUsername'
                    ? validateEmail(value)
                    : validatePassword(value)
            setErrors((prev) => ({ ...prev, [field]: error }))
        }
    }

    const handleBlur = (field) => {
        setTouched((prev) => ({ ...prev, [field]: true }))
        const value = formData[field]
        const error =
            field === 'emailOrUsername'
                ? validateEmail(value)
                : validatePassword(value)
        setErrors((prev) => ({ ...prev, [field]: error }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()


        setTouched({ emailOrUsername: true, password: true })


        const emailError = validateEmail(formData.emailOrUsername)
        const passwordError = validatePassword(formData.password)

        setErrors({
            emailOrUsername: emailError,
            password: passwordError,
        })


        if (emailError) {
            emailRef.current?.focus()
            return
        }
        if (passwordError) {
            passwordRef.current?.focus()
            return
        }


        const payload = {
            identifier: formData.emailOrUsername.trim(),
            password: formData.password,
        }



        try {
            setIsSubmitting(true)
            setApiError('')
            console.log(process.env.NEXT_PUBLIC_API_URL + "/api/login")
            const result = await axios.post(process.env.NEXT_PUBLIC_API_URL + "/api/login", payload, {
                withCredentials: true
            })
            loginStore(result.data.user);
            // console.log(result)
            router.push("/");
        } catch (err) {
            setApiError(
                err?.message || 'Login failed. Please check your credentials and try again.'
            )
            console.log(err)
            topTost("error", err.response?.data?.message || "Login failed. Please try again.")
        } finally {
            setIsSubmitting(false)
        }

    }

    return (
        <>
            <h2 className="fs-20 fw-bolder mb-4 d-flex justify-content-center">
                Login
            </h2>
            <h4 className="fs-13 fw-bold mb-2">Login to your account</h4>
            <p className="fs-12 fw-medium text-muted">
                Thank you for get back <strong>Task</strong> Market Place, let's access
                our tasks for you.
            </p>

            {/* ── API / Server Error Banner ──────────────────── */}
            {/* {apiError && (
                <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3" role="alert">
                    <i className="me-2">⚠</i>
                    <span className="fs-12">{apiError}</span>
                </div>
            )} */}

            <form onSubmit={handleSubmit} className="w-100 mt-4 pt-2" noValidate>
                <div className="mb-4">
                    <input
                        ref={emailRef}
                        type="text"
                        className={`form-control ${touched.emailOrUsername
                            ? errors.emailOrUsername
                                ? 'is-invalid'
                                : 'is-valid'
                            : ''
                            }`}
                        placeholder="Email or Username"
                        value={formData.emailOrUsername}
                        onChange={(e) => handleChange('emailOrUsername', e.target.value)}
                        onBlur={() => handleBlur('emailOrUsername')}
                        disabled={isSubmitting}
                        autoComplete="username"
                        autoFocus
                    />
                    {touched.emailOrUsername && errors.emailOrUsername && (
                        <div className="invalid-feedback">{errors.emailOrUsername}</div>
                    )}
                </div>

                {/* ── Password ─────────────────────────────────── */}
                <div className="mb-3">
                    <input
                        ref={passwordRef}
                        type="password"
                        className={`form-control ${touched.password
                            ? errors.password
                                ? 'is-invalid'
                                : 'is-valid'
                            : ''
                            }`}
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        onBlur={() => handleBlur('password')}
                        disabled={isSubmitting}
                        autoComplete="current-password"
                    />
                    {touched.password && errors.password && (
                        <div className="invalid-feedback">{errors.password}</div>
                    )}
                </div>

                {/* ── Forgot Password ──────────────────────────── */}
                <div className="d-flex align-items-center justify-content-between">
                    <div></div>
                    <div>
                        <Link href={resetPath} className="fs-11 text-primary">
                            Forget password?
                        </Link>
                    </div>
                </div>

                {/* ── Submit Button ────────────────────────────── */}
                <div className="mt-5">
                    <button
                        type="submit"
                        className="btn btn-lg btn-primary w-100"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <RotatingLines
                                    visible={true}
                                    height="32"
                                    width="32"
                                    color="white"
                                    strokeWidth="5"
                                    animationDuration="0.75"
                                    ariaLabel="rotating-lines-loading"
                                    wrapperStyle={{}}
                                    wrapperClass=""
                                />&nbsp;
                                Logging in...
                            </>
                        ) : (
                            'Login'
                        )}
                    </button>
                </div>
            </form>

            {/* ── Register Link ──────────────────────────────── */}
            <div className="mt-5 text-muted">
                <span> Don't have an account?</span>
                <Link href={registerPath} className="fw-bold">
                    {' '}
                    Create an Account
                </Link>
            </div>
        </>
    )
}

export default LoginForm