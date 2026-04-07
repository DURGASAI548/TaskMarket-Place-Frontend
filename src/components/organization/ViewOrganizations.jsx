'use client'
import React, { useState, useEffect } from 'react'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'
import Link from 'next/link'
import { FiEdit, FiTrash2, FiUsers, FiGitBranch, FiCheckSquare, FiPlus, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
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
                    {[1, 2, 3].map((i) => (
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
const ViewOrganizations = () => {
    const [organizationData, setOrganizationData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState('')

    // ── FIX: Store the _id of the card being deleted (null = nothing deleting)
    //    Old: const [deleting, setDeleting] = useState(false)  ← shared boolean, breaks all cards
    //    New: track which specific card is deleting
    const [deletingId, setDeletingId] = useState(null)

    const maxDescLength = 200

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

    // ── Fetch Organizations ───────────────────────────────
    const fetchOrganizations = async () => {
        try {
            setLoading(true)
            setFetchError('')

            const result = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/get-organizations`,
                { withCredentials: true }
            )

            setOrganizationData(result.data.data)
        } catch (err) {
            console.error('Failed to fetch organizations:', err)
            setFetchError(
                err?.response?.data?.message || 'Failed to load organizations. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrganizations()
    }, [])

    // ── Delete Handler ────────────────────────────────────
    const handleDelete = async (id) => {
        // Prevent clicking another delete while one is in progress
        if (deletingId) return

        try {
            setDeletingId(id)

            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/delete-organization/${id}`,
                { withCredentials: true }
            )

            // Remove from local state using the id param directly
            setOrganizationData((prev) =>
                prev.filter((org) => org._id !== id)
            )

            topTost?.('success', 'Organization deleted successfully!')
        } catch (err) {
            console.error('Failed to delete organization:', err)
            const message =
                err?.response?.data?.message || 'Failed to delete organization. Please try again.'
            topTost?.('error', message)
        } finally {
            setDeletingId(null)
        }
    }

    // ── Derived: is ANY delete happening right now? ───────
    const isAnyDeleting = deletingId !== null

    // ── Loading State ─────────────────────────────────────
    if (loading) {
        return (
            <div className="row">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
        )
    }

    // ── Error State ───────────────────────────────────────
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
                            onClick={fetchOrganizations}
                        >
                            <FiRefreshCw size={14} className="me-2" />
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── Empty State ───────────────────────────────────────
    if (!organizationData || organizationData.length === 0) {
        return (
            <div className="col-12">
                <div className="card border-0 shadow-sm">
                    <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                        <div
                            className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 mb-3"
                            style={{ width: 64, height: 64 }}
                        >
                            <FiGitBranch size={28} className="text-primary" />
                        </div>
                        <h6 className="fw-bold mb-1">No organizations yet</h6>
                        <p className="text-muted fs-13 mb-3 text-center" style={{ maxWidth: 360 }}>
                            Get started by creating your first organization to manage branches, users, and tasks.
                        </p>
                        <Link
                            href="/add-organizations"
                            className="btn btn-primary btn-sm d-flex align-items-center"
                        >
                            <FiPlus size={14} className="me-2" />
                            Create Organization
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Header bar */}
            <div className="col-12 d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="fw-bold mb-0">Organizations</h5>
                    <p className="text-muted fs-12 mb-0">
                        {organizationData.length} organization{organizationData.length !== 1 ? 's' : ''} found
                    </p>
                </div>
                <Link
                    href="/add-organization"
                    className="btn btn-primary btn-sm d-flex align-items-center"
                >
                    <FiPlus size={14} className="me-2" />
                    Add Organization
                </Link>
            </div>

            <div className="row">
                {organizationData.map((org) => {
                    const isThisDeleting = deletingId === org._id

                    return (
                        <div className="col-lg-4 col-md-6 col-12 mb-4" key={org._id}>
                            <div
                                className="card h-100 border-0 shadow-sm"
                                style={{
                                    // Dim other cards while one is being deleted
                                    opacity: isAnyDeleting && !isThisDeleting ? 0.5 : 1,
                                    transition: 'opacity 0.25s ease',
                                }}
                            >
                                <div className="card-body d-flex flex-column">
                                    {/* ── Header: Avatar + Name + Admin ─────── */}
                                    <div className="d-flex align-items-start mb-3">
                                        <div
                                            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 me-3"
                                            style={{
                                                width: 48,
                                                height: 48,
                                                background: colors[(org.orgName || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
                                                    colors.length].bg,
                                                color: colors[(org.orgName || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
                                                    colors.length].text,
                                                fontWeight: 700,
                                                fontSize: 16,
                                            }}
                                        >
                                            {(org.orgName || '')
                                                .split(' ')
                                                .slice(0, 2)
                                                .map((w) => w[0]?.toUpperCase())
                                                .join('') || '?'}
                                        </div>
                                        <div className="flex-grow-1 min-width-0">
                                            <h6 className="fw-bold mb-0 text-truncate" title={org.orgName}>
                                                {org.orgName}
                                            </h6>
                                            {org.orgAdminUser && (
                                                <div className="d-flex align-items-center mt-1">
                                                    <BsPatchCheckFill size={12} className="text-primary me-1 flex-shrink-0" />
                                                    <span
                                                        className="fs-11 text-muted text-truncate"
                                                        title={typeof org.orgAdminUser === 'object' ? org.orgAdminUser.name : ''}
                                                    >
                                                        {typeof org.orgAdminUser === 'object'
                                                            ? org.orgAdminUser.name || org.orgAdminUser.email || 'Admin'
                                                            : 'Admin assigned'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Description ───────────────────────── */}
                                    <p
                                        className="fs-12 text-muted mb-3 flex-grow-1"
                                        title={org.orgDescription}
                                        style={{ lineHeight: '1.6' }}
                                    >
                                        {(org.orgDescription || '').length > maxDescLength
                                            ? org.orgDescription.slice(0, maxDescLength).trim() + '...'
                                            : org.orgDescription || 'No description provided'}
                                    </p>

                                    {/* ── Stats Row ─────────────────────────── */}
                                    <div className="d-flex gap-2 mb-3">
                                        <div className="flex-fill py-2 px-2 rounded-2 text-center border border-dashed border-gray-5">
                                            <div className="d-flex align-items-center justify-content-center mb-1">
                                                <FiGitBranch size={13} className="text-primary" />
                                            </div>
                                            <h6 className="fs-15 fw-bolder mb-0">{org.branchCount ?? 0}</h6>
                                            <p className="fs-11 text-muted mb-0">Branches</p>
                                        </div>
                                        <div className="flex-fill py-2 px-2 rounded-2 text-center border border-dashed border-gray-5">
                                            <div className="d-flex align-items-center justify-content-center mb-1">
                                                <FiUsers size={13} className="text-success" />
                                            </div>
                                            <h6 className="fs-15 fw-bolder mb-0">{org.userCount ?? 0}</h6>
                                            <p className="fs-11 text-muted mb-0">Users</p>
                                        </div>
                                        <div className="flex-fill py-2 px-2 rounded-2 text-center border border-dashed border-gray-5">
                                            <div className="d-flex align-items-center justify-content-center mb-1">
                                                <FiCheckSquare size={13} className="text-warning" />
                                            </div>
                                            <h6 className="fs-15 fw-bolder mb-0">{org.taskCount ?? 0}</h6>
                                            <p className="fs-11 text-muted mb-0">Tasks</p>
                                        </div>
                                    </div>

                                    {/* ── Created Date ──────────────────────── */}
                                    {org.createdAt && (
                                        <p className="fs-11 text-muted mb-3">
                                            Created {new Date(org.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    )}

                                    {/* ── Action Buttons ────────────────────── */}
                                    <div className="d-flex gap-2 mt-auto">
                                        <button
                                            className="w-50 btn btn-light-brand d-flex align-items-center justify-content-center"
                                            onClick={() => handleDelete(org._id)}
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
                                                    ariaLabel="deleting-organization"
                                                />
                                            ) : (
                                                <>
                                                    <FiTrash2 size={14} className="me-2" />
                                                    <span>Delete</span>
                                                </>
                                            )}
                                        </button>

                                        {/* Edit: render as disabled button during delete, Link otherwise */}
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
                                                href={`/edit-organizations/${org._id}`}
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

export default ViewOrganizations