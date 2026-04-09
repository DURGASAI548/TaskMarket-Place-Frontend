'use client'
import React, { useState, useEffect, useMemo } from 'react'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'
import Link from 'next/link'
import Image from 'next/image'
import { FiEdit, FiTrash2, FiUsers, FiUser, FiCheckSquare, FiPlus, FiAlertCircle, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi'
import { BsPatchCheckFill } from 'react-icons/bs'

const SkeletonCard = () => (
    <div className="col-lg-4 col-md-6 col-12 mb-4">
        <div className="card h-100">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <div className="placeholder-glow">
                            <span className="placeholder col-8 bg-secondary rounded" style={{ height: 20, display: 'block', width: 160 }}></span>
                        </div>
                        <div className="placeholder-glow mt-2">
                            <span className="placeholder col-6 bg-secondary rounded" style={{ height: 14, display: 'block', width: 100 }}></span>
                        </div>
                    </div>
                    <div className="placeholder-glow">
                        <span className="placeholder bg-secondary rounded-circle" style={{ width: 40, height: 40, display: 'block' }}></span>
                    </div>
                </div>
                <div className="placeholder-glow mb-3">
                    <span className="placeholder col-12 bg-secondary rounded" style={{ height: 12, display: 'block' }}></span>
                    <span className="placeholder col-9 bg-secondary rounded mt-1" style={{ height: 12, display: 'block' }}></span>
                </div>
                <div className="d-flex gap-2 mb-3">
                    {[1, 2].map((i) => (
                        <div key={i} className="placeholder-glow flex-fill">
                            <span className="placeholder bg-secondary rounded" style={{ height: 60, display: 'block' }}></span>
                        </div>
                    ))}
                </div>
                <div className="d-flex gap-2">
                    <div className="placeholder-glow flex-fill">
                        <span className="placeholder bg-secondary rounded" style={{ height: 38, display: 'block' }}></span>
                    </div>
                    <div className="placeholder-glow flex-fill">
                        <span className="placeholder bg-secondary rounded" style={{ height: 38, display: 'block' }}></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
)

// ── Main Component ────────────────────────────────────────
const ViewBranches = () => {
    const [branchData, setBranchData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState('')
    const [deletingId, setDeletingId] = useState(null)

    // ── Filter State ────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState('all') // 'all' | 'admin' | 'org'

    const colors = [
        { bg: '#e0e7ff', text: '#4338ca' },
        { bg: '#dbeafe', text: '#1d4ed8' },
        { bg: '#d1fae5', text: '#047857' },
        { bg: '#fef3c7', text: '#b45309' },
        { bg: '#fce7f3', text: '#be185d' },
        { bg: '#ede9fe', text: '#6d28d9' },
        { bg: '#e0f2fe', text: '#0369a1' },
        { bg: '#fde2e2', text: '#c53030' },
    ]

    const getColor = (name) => {
        const index = (name || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % colors.length
        return colors[index]
    }

    const getInitials = (name) => {
        return (name || '')
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join('') || '?'
    }

    // ── Fetch Branches ──────────────────────────────────
    const fetchBranches = async () => {
        try {
            setLoading(true)
            setFetchError('')

            const result = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/get-branches`,
                { withCredentials: true }
            )

            setBranchData(result.data.data)
        } catch (err) {
            console.error('Failed to fetch branches:', err)
            setFetchError(
                err?.response?.data?.message || 'Failed to load branches. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBranches()
    }, [])

    // ── Filtered Data ───────────────────────────────────
    const filteredData = useMemo(() => {
        if (!branchData) return null
        if (!searchQuery.trim()) return branchData

        const query = searchQuery.trim().toLowerCase()

        return branchData.filter((branch) => {
            const adminName = (branch.adminName || '').toLowerCase()
            const orgName = (branch.orgName || '').toLowerCase()
            const branchName = (branch.branchName || '').toLowerCase()

            if (filterType === 'admin') return adminName.includes(query)
            if (filterType === 'org') return orgName.includes(query)
            // 'all' — search across branch name, admin name, and org name
            return branchName.includes(query) || adminName.includes(query) || orgName.includes(query)
        })
    }, [branchData, searchQuery, filterType])

    // ── Delete Handler ──────────────────────────────────
    const handleDelete = async (id) => {
        if (deletingId) return

        try {
            setDeletingId(id)

            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/delete-branch/${id}`,
                { withCredentials: true }
            )

            setBranchData((prev) => prev.filter((branch) => branch._id !== id))
            topTost?.('success', 'Branch deleted successfully!')
        } catch (err) {
            console.error('Failed to delete branch:', err)
            const message =
                err?.response?.data?.message || 'Failed to delete branch. Please try again.'
            topTost?.('error', message)
        } finally {
            setDeletingId(null)
        }
    }

    const isAnyDeleting = deletingId !== null

    // ── Loading State ───────────────────────────────────
    if (loading) {
        return (
            <div className="row">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
        )
    }

    // ── Error State ─────────────────────────────────────
    if (fetchError) {
        return (
            <div className="col-12">
                <div className="card border-0 shadow-sm">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <div
                            className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10 mb-3"
                            style={{ width: 64, height: 64 }}
                        >
                            <FiAlertCircle size={28} className="text-danger" />
                        </div>
                        <h6 className="fw-bold mb-1">Something went wrong</h6>
                        <p className="text-muted fs-13 mb-3 text-center" style={{ maxWidth: 360 }}>
                            {fetchError}
                        </p>
                        <button
                            className="btn btn-primary btn-sm d-flex align-items-center"
                            onClick={fetchBranches}
                        >
                            <FiRefreshCw size={14} className="me-2" />
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── Empty State ─────────────────────────────────────
    if (!branchData || branchData.length === 0) {
        return (
            <div className="col-12">
                <div className="card border-0 shadow-sm">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <div
                            className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 mb-3"
                            style={{ width: 64, height: 64 }}
                        >
                            <FiUsers size={28} className="text-primary" />
                        </div>
                        <h6 className="fw-bold mb-1">No branches yet</h6>
                        <p className="text-muted fs-13 mb-3 text-center" style={{ maxWidth: 360 }}>
                            Get started by creating your first branch to organize users and tasks.
                        </p>
                        <Link
                            href="/add-branches"
                            className="btn btn-primary btn-sm d-flex align-items-center"
                        >
                            <FiPlus size={14} className="me-2" />
                            Create Branch
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    // ── Data Loaded ─────────────────────────────────────
    return (
        <>
            {/* ── Header Bar ─────────────────────────────── */}
            <div className="col-12 d-flex flex-wrap justify-content-between align-items-center mb-3">
                <div>
                    <h5 className="fw-bold mb-0">Branches</h5>
                    <p className="text-muted fs-12 mb-0">
                        {branchData.length} branch{branchData.length !== 1 ? 'es' : ''} total
                    </p>
                </div>
                <Link
                    href="/add-branch"
                    className="btn btn-primary btn-sm d-flex align-items-center"
                >
                    <FiPlus size={14} className="me-2" />
                    Add Branch
                </Link>
            </div>

            {/* ── Filter Bar ─────────────────────────────── */}
            <div className="col-12 mb-4">
                <div className="card border-0 shadow-sm">
                    <div className="card-body py-3">
                        <div className="row align-items-center g-2">
                            {/* Search Input */}
                            <div className="col-lg-6 col-md-7">
                                <div className="position-relative">
                                    <FiSearch
                                        size={15}
                                        className="text-muted position-absolute"
                                        style={{ left: 12, top: '50%', transform: 'translateY(-50%)' }}
                                    />
                                    <input
                                        type="text"
                                        className="form-control ps-5 pe-5"
                                        placeholder={
                                            filterType === 'admin'
                                                ? 'Search by admin name...'
                                                : filterType === 'org'
                                                    ? 'Search by organization name...'
                                                    : 'Search branches, admins, or organizations...'
                                        }
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button
                                            className="btn btn-sm position-absolute border-0 p-0"
                                            style={{ right: 12, top: '50%', transform: 'translateY(-50%)' }}
                                            onClick={() => setSearchQuery('')}
                                        >
                                            <FiX size={15} className="text-muted" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filter Buttons */}
                            <div className="col-lg-6 col-md-5 d-flex gap-2 justify-content-md-end">
                                {[
                                    { key: 'all', label: 'All' },
                                    { key: 'admin', label: 'By Admin' },
                                    { key: 'org', label: 'By Organization' },
                                ].map((f) => (
                                    <button
                                        key={f.key}
                                        className={`btn btn-sm ${filterType === f.key
                                                ? 'btn-primary'
                                                : 'btn-outline-secondary'
                                            }`}
                                        onClick={() => setFilterType(f.key)}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Active filter info */}
                        {searchQuery.trim() && (
                            <div className="mt-2 d-flex align-items-center">
                                <span className="fs-12 text-muted">
                                    Showing {filteredData?.length ?? 0} of {branchData.length} branch{branchData.length !== 1 ? 'es' : ''}
                                    {filterType !== 'all' && (
                                        <span> filtered by <strong>{filterType === 'admin' ? 'admin name' : 'organization'}</strong></span>
                                    )}
                                </span>
                                <button
                                    className="btn btn-sm btn-link text-decoration-none p-0 ms-2 fs-12"
                                    onClick={() => {
                                        setSearchQuery('')
                                        setFilterType('all')
                                    }}
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── No Results State ───────────────────────── */}
            {filteredData && filteredData.length === 0 && (
                <div className="col-12">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                            <FiSearch size={32} className="text-muted mb-3" />
                            <h6 className="fw-bold mb-1">No branches found</h6>
                            <p className="text-muted fs-13 mb-3 text-center" style={{ maxWidth: 360 }}>
                                No branches match "<strong>{searchQuery}</strong>"
                                {filterType !== 'all' && (
                                    <> when filtering by <strong>{filterType === 'admin' ? 'admin name' : 'organization'}</strong></>
                                )}. Try a different search or clear filters.
                            </p>
                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => {
                                    setSearchQuery('')
                                    setFilterType('all')
                                }}
                            >
                                Clear filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Cards Grid ─────────────────────────────── */}
            <div className="row">
                {filteredData && filteredData.map((branch) => {
                    const isThisDeleting = deletingId === branch._id
                    const color = getColor(branch.branchName)

                    return (
                        <div className="col-lg-4 col-md-6 col-12 mb-4" key={branch._id}>
                            <div
                                className="card h-100 border-0 shadow-sm"
                                style={{
                                    opacity: isAnyDeleting && !isThisDeleting ? 0.5 : 1,
                                    transition: 'opacity 0.25s ease',
                                }}
                            >
                                <div className="card-body d-flex flex-column">

                                    {/* ── Header: Initials + Branch Name ──── */}
                                    <div className="d-flex align-items-start mb-3">
                                        <div
                                            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 me-3"
                                            style={{
                                                width: 48,
                                                height: 48,
                                                background: color.bg,
                                                color: color.text,
                                                fontWeight: 700,
                                                fontSize: 16,
                                            }}
                                        >
                                            {getInitials(branch.branchName)}
                                        </div>
                                        <div className="flex-grow-1 min-width-0">
                                            <h6 className="fw-bold mb-0 text-truncate" title={branch.branchName}>
                                                {branch.branchName}
                                            </h6>
                                            {/* Organization badge */}
                                            <span
                                                className="badge bg-light text-dark fw-normal mt-1 text-truncate d-inline-block"
                                                style={{ maxWidth: '100%', fontSize: '0.7rem' }}
                                                title={branch.orgName}
                                            >
                                                {branch.orgName || 'No Organization'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* ── Admin Info ─────────────────────── */}
                                    <div className="d-flex align-items-center mb-3 p-2 rounded-2" style={{ background: '#f9fafb' }}>
                                        {branch.adminProfileURL ? (
                                            <Image
                                                src={branch.adminProfileURL}
                                                alt={branch.adminName || 'Admin'}
                                                width={32}
                                                height={32}
                                                className="rounded-circle flex-shrink-0 me-2"
                                                style={{ objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div
                                                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 me-2"
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    background: getColor(branch.adminName).bg,
                                                    color: getColor(branch.adminName).text,
                                                }}
                                            >
                                                <FiUser size={16} />
                                            </div>
                                        )}
                                        <div className="min-width-0">
                                            <div className="d-flex align-items-center">
                                                <BsPatchCheckFill size={11} className="text-primary me-1 flex-shrink-0" />
                                                <span className="fs-12 fw-medium text-truncate" title={branch.adminName}>
                                                    {branch.adminName || 'No Admin'}
                                                </span>
                                            </div>
                                            &nbsp;&nbsp;&nbsp;&nbsp;<span className="fs-11 text-muted">Branch Admin</span>
                                        </div>
                                    </div>

                                    {/* ── Stats Row ─────────────────────── */}
                                    <div className="d-flex gap-2 mb-3">
                                        <div className="flex-fill py-2 px-2 rounded-2 text-center border border-dashed border-gray-5">
                                            <div className="d-flex align-items-center justify-content-center mb-1">
                                                <FiUsers size={13} className="text-success" />
                                            </div>
                                            <h6 className="fs-15 fw-bolder mb-0">{branch.userCount ?? 0}</h6>
                                            <p className="fs-11 text-muted mb-0">Users</p>
                                        </div>
                                        <div className="flex-fill py-2 px-2 rounded-2 text-center border border-dashed border-gray-5">
                                            <div className="d-flex align-items-center justify-content-center mb-1">
                                                <FiCheckSquare size={13} className="text-warning" />
                                            </div>
                                            <h6 className="fs-15 fw-bolder mb-0">{branch.taskCount ?? 0}</h6>
                                            <p className="fs-11 text-muted mb-0">Tasks</p>
                                        </div>
                                    </div>

                                    {/* ── Created Date ──────────────────── */}
                                    {branch.createdAt && (
                                        <p className="fs-11 text-muted mb-3">
                                            Created {new Date(branch.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    )}

                                    {/* ── Action Buttons ────────────────── */}
                                    <div className="d-flex gap-2 mt-auto">
                                        <button
                                            className="w-50 btn btn-light-brand d-flex align-items-center justify-content-center"
                                            onClick={() => handleDelete(branch._id)}
                                            disabled={isAnyDeleting}
                                        >
                                            {isThisDeleting ? (
                                                <RotatingLines
                                                    visible={true}
                                                    height="20"
                                                    width="20"
                                                    color="grey"
                                                    strokeWidth="5"
                                                    animationDuration="0.75"
                                                    ariaLabel="deleting-branch"
                                                />
                                            ) : (
                                                <>
                                                    <FiTrash2 size={14} className="me-2" />
                                                    <span>Delete</span>
                                                </>
                                            )}
                                        </button>

                                        {isAnyDeleting ? (
                                            <button
                                                className="w-50 btn btn-primary d-flex align-items-center justify-content-center"
                                                disabled
                                            >
                                                <FiEdit size={14} className="me-2" />
                                                <span>Edit</span>
                                            </button>
                                        ) : (
                                            <Link
                                                href={`/edit-branches/${branch._id}`}
                                                className="w-50 btn btn-primary d-flex align-items-center justify-content-center"
                                            >
                                                <FiEdit size={14} className="me-2" />
                                                <span>Edit</span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    )
}

export default ViewBranches