'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    FiMoreVertical, FiEdit, FiTrash2, FiSearch, FiX,
    FiPlus, FiUser, FiAlertCircle, FiRefreshCw,
    FiChevronLeft, FiChevronRight,
} from 'react-icons/fi'
import CardHeader from '@/components/shared/CardHeader'
import CardLoader from '@/components/shared/CardLoader'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'

const PAGE_SIZE = 10

const SkeletonRow = () => (
    <tr>
        <td>
            <div className="d-flex align-items-center gap-3">
                <div className="placeholder-glow">
                    <span className="placeholder bg-secondary rounded-circle" style={{ width: 38, height: 38, display: 'inline-block' }} />
                </div>
                <div>
                    <div className="placeholder-glow"><span className="placeholder bg-secondary rounded" style={{ width: 120, height: 13, display: 'block' }} /></div>
                    <div className="placeholder-glow mt-1"><span className="placeholder bg-secondary rounded" style={{ width: 160, height: 10, display: 'block' }} /></div>
                </div>
            </div>
        </td>
        {[70, 100, 110, 90, 50, 80].map((w, i) => (
            <td key={i}><div className="placeholder-glow"><span className="placeholder bg-secondary rounded" style={{ width: w, height: i === 4 ? 20 : 13, display: 'block' }} /></div></td>
        ))}
        <td className="text-end"><div className="placeholder-glow"><span className="placeholder bg-secondary rounded" style={{ width: 20, height: 20, display: 'inline-block' }} /></div></td>
    </tr>
)

// ══════════════════════════════════════════════════════════
// SELF-CONTAINED PAGINATION COMPONENT
// Styled to match the existing card-footer / Bootstrap look
// ══════════════════════════════════════════════════════════
const UserPagination = ({ currentPage, totalPages, totalItems, from, to, onPageChange }) => {
    if (totalPages <= 1) return null

    // Build visible page numbers — always show first, last,
    // current, and up to 1 neighbour on each side.
    // Gaps get an ellipsis.
    const buildPages = () => {
        const pages = []
        const delta = 1 // neighbours on each side of current

        const range = []
        for (
            let i = Math.max(1, currentPage - delta);
            i <= Math.min(totalPages, currentPage + delta);
            i++
        ) {
            range.push(i)
        }

        // Always include first page
        if (range[0] > 2) pages.push(1, '...')
        else if (range[0] === 2) pages.push(1)

        range.forEach((p) => pages.push(p))

        // Always include last page
        if (range[range.length - 1] < totalPages - 1) pages.push('...', totalPages)
        else if (range[range.length - 1] === totalPages - 1) pages.push(totalPages)

        return pages
    }

    const pages = buildPages()
    const isFirst = currentPage === 1
    const isLast  = currentPage === totalPages

    return (
        <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 w-100">

            {/* Entry info — matches dataTables_info style */}
            <span className="fs-12 text-muted">
                Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{totalItems}</strong> users
            </span>

            {/* Page buttons */}
            <ul className="pagination pagination-sm mb-0 flex-wrap justify-content-center">
                {/* Previous */}
                <li className={`page-item ${isFirst ? 'disabled' : ''}`}>
                    <button
                        className="page-link d-flex align-items-center gap-1"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={isFirst}
                        aria-label="Previous page"
                    >
                        <FiChevronLeft size={13} />Prev
                    </button>
                </li>

                {/* Page numbers */}
                {pages.map((p, idx) =>
                    p === '...' ? (
                        <li key={`ellipsis-${idx}`} className="page-item disabled">
                            <span className="page-link px-2">…</span>
                        </li>
                    ) : (
                        <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
                            <button
                                className="page-link "
                                onClick={() => onPageChange(p)}
                                aria-current={p === currentPage ? 'page' : undefined}
                            >
                                {p}
                            </button>
                        </li>
                    )
                )}

                {/* Next */}
                <li className={`page-item ${isLast ? 'disabled' : ''}`}>
                    <button
                        className="page-link d-flex align-items-center gap-1"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={isLast}
                        aria-label="Next page"
                    >
                        <span className="d-none d-sm-inline">Next</span>
                        <FiChevronRight size={13} />
                    </button>
                </li>
            </ul>
        </div>
    )
}

// ── Helpers ────────────────────────────────────────────────
const hasValidImage = (url) => url && url !== 'null' && url !== 'undefined' && url.trim() !== ''

const getUserTypeColor = (type) => {
    const t = (type || '').toLowerCase()
    if (t === 'branchadmin') return 'primary'
    if (t === 'superadmin')  return 'danger'
    if (t === 'orgadmin')    return 'warning'
    return 'success'
}

const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

const ViewUsers = ({ title = 'Users' }) => {
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete: handleCardDelete } = useCardTitleActions()

    const [users,      setUsers]      = useState(null)
    const [loading,    setLoading]    = useState(true)
    const [fetchError, setFetchError] = useState('')

    const [deletingId,      setDeletingId]      = useState(null)
    const [activeDropdown,  setActiveDropdown]  = useState(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [filterType,  setFilterType]  = useState('all')

    // ── Pagination state ──────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1)

    const dropdownRef = useRef(null)

    // ── Fetch ─────────────────────────────────────────────
    const fetchUsers = async () => {
        try {
            setLoading(true)
            setFetchError('')
            const result = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/get-users`,
                { withCredentials: true }
            )
            setUsers(result.data.data)
        } catch (err) {
            console.error('Failed to fetch users:', err)
            setFetchError(err?.response?.data?.message || 'Failed to load users. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchUsers() }, [])
    useEffect(() => { if (refreshKey) fetchUsers() }, [refreshKey])

    // Reset to page 1 whenever search/filter changes
    useEffect(() => { setCurrentPage(1) }, [searchQuery, filterType])

    // Close actions dropdown on outside click
    useEffect(() => {
        if (!activeDropdown) return
        const close = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setActiveDropdown(null)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [activeDropdown])

    // ── Filtered list ─────────────────────────────────────
    const filteredUsers = useMemo(() => {
        if (!users) return null
        if (!searchQuery.trim()) return users

        const q = searchQuery.trim().toLowerCase()
        return users.filter((u) => {
            const name  = (u.name         || '').toLowerCase()
            const email = (u.email        || '').toLowerCase()
            const org   = (u.organizationName || '').toLowerCase()
            const branch= (u.branchName   || '').toLowerCase()
            const roll  = (u.rollNo       || '').toLowerCase()
            const dn    = (u.displayName  || '').toLowerCase()

            switch (filterType) {
                case 'name':   return name.includes(q) || dn.includes(q)
                case 'email':  return email.includes(q)
                case 'org':    return org.includes(q)
                case 'branch': return branch.includes(q)
                case 'roll':   return roll.includes(q)
                default:       return name.includes(q) || email.includes(q) || org.includes(q) || branch.includes(q) || roll.includes(q) || dn.includes(q)
            }
        })
    }, [users, searchQuery, filterType])

    // ── Pagination calculations ───────────────────────────
    const totalItems = filteredUsers?.length ?? 0
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))

    // Clamp page if filter shrinks the list
    const safePage = Math.min(currentPage, totalPages)

    const from       = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
    const to         = Math.min(safePage * PAGE_SIZE, totalItems)
    const pageSlice  = filteredUsers?.slice(from - 1, to) ?? []

    // ── Delete ────────────────────────────────────────────
    const handleDeleteUser = async (id) => {
        if (deletingId) return
        try {
            setDeletingId(id)
            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/delete-user/${id}`,
                { withCredentials: true }
            )
            setUsers((prev) => prev.filter((u) => u._id !== id))
            topTost?.('success', 'User deleted successfully!')
        } catch (err) {
            console.error('Failed to delete user:', err)
            topTost?.('error', err?.response?.data?.message || 'Failed to delete user.')
        } finally {
            setDeletingId(null)
            setActiveDropdown(null)
        }
    }

    const isAnyDeleting = deletingId !== null

    if (isRemoved) return null

    const tableHead = (
        <thead>
            <tr className="border-b">
                <th scope="row">User</th>
                <th>Roll No</th>
                <th>Organization</th>
                <th>Branch</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Joined</th>
                <th className="text-end">Actions</th>
            </tr>
        </thead>
    )

    return (
        <div className="col-xxl-12">
            <div className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${refreshKey ? 'card-loading' : ''}`}>
                {/* <CardHeader title={title} refresh={handleRefresh} remove={handleCardDelete} expanded={handleExpand} /> */}

                {/* ── Search & Filter ─────────────────────── */}
                {!loading && !fetchError && users && users.length > 0 && (
                    <div className="card-header py-3 border-top">
                        <div className="row align-items-center g-2 w-100">
                            {/* Search input */}
                            <div className="col-lg-5 col-6">
                                <div className="position-relative">
                                    <FiSearch size={14} className="text-muted position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        className="form-control form-control-sm ps-5 pe-5"
                                        placeholder={
                                            filterType === 'name'   ? 'Search by name...'
                                            : filterType === 'email'  ? 'Search by email...'
                                            : filterType === 'org'    ? 'Search by organization...'
                                            : filterType === 'branch' ? 'Search by branch...'
                                            : filterType === 'roll'   ? 'Search by roll number...'
                                            : 'Search users...'
                                        }
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button className="btn btn-sm position-absolute border-0 p-0"
                                            style={{ right: 10, top: '50%', transform: 'translateY(-50%)' }}
                                            onClick={() => setSearchQuery('')}>
                                            <FiX size={14} className="text-muted" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filter pills */}
                            <div className="col-lg-5 col-md-4 col-5 d-flex gap-1 flex-wrap">
                                {[
                                    { key: 'all',    label: 'All' },
                                    { key: 'name',   label: 'Name' },
                                    { key: 'email',  label: 'Email' },
                                    { key: 'org',    label: 'Org' },
                                    { key: 'branch', label: 'Branch' },
                                    { key: 'roll',   label: 'Roll No' },
                                ].map((f) => (
                                    <button key={f.key}
                                        className={`btn btn-xs ${filterType === f.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                        onClick={() => setFilterType(f.key)}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* Add user */}
                            <div className="col-lg-2 col-md-2 text-end col-4">
                                <Link href="/add-users" className="btn btn-sm btn-primary">
                                    <FiPlus size={14} className="me-1" />Add User
                                </Link>
                            </div>
                        </div>

                        {/* Result count */}
                        {searchQuery.trim() && filteredUsers && (
                            <div className="mt-2">
                                <span className="fs-11 text-muted">
                                    {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
                                </span>
                                <button className="btn btn-sm btn-link text-decoration-none p-0 ms-2 fs-11"
                                    onClick={() => { setSearchQuery(''); setFilterType('all') }}>
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Table ───────────────────────────────── */}
                <div className="card-body custom-card-action p-0">

                    {/* Skeleton */}
                    {loading && (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                {tableHead}
                                <tbody>{[1,2,3,4,5,6,7,8].map((i) => <SkeletonRow key={i} />)}</tbody>
                            </table>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && fetchError && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10 mb-3" style={{ width: 56, height: 56 }}>
                                <FiAlertCircle size={24} className="text-danger" />
                            </div>
                            <h6 className="fw-bold mb-1 fs-13">Failed to load users</h6>
                            <p className="text-muted fs-12 mb-3 text-center" style={{ maxWidth: 320 }}>{fetchError}</p>
                            <button className="btn btn-sm btn-primary d-flex align-items-center" onClick={fetchUsers}>
                                <FiRefreshCw size={13} className="me-1" /> Try Again
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !fetchError && (!users || users.length === 0) && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 mb-3" style={{ width: 56, height: 56 }}>
                                <FiUser size={24} className="text-primary" />
                            </div>
                            <h6 className="fw-bold mb-1 fs-13">No users yet</h6>
                            <p className="text-muted fs-12 mb-3">Get started by adding your first user.</p>
                            <Link href="/add-users" className="btn btn-sm btn-primary d-flex align-items-center">
                                <FiPlus size={13} className="me-1" /> Add User
                            </Link>
                        </div>
                    )}

                    {/* No search results */}
                    {!loading && !fetchError && users && users.length > 0 && filteredUsers && filteredUsers.length === 0 && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <FiSearch size={28} className="text-muted mb-3" />
                            <h6 className="fw-bold mb-1 fs-13">No users found</h6>
                            <p className="text-muted fs-12 mb-3 text-center" style={{ maxWidth: 320 }}>
                                No results for &quot;{searchQuery}&quot;{filterType !== 'all' && <> in <strong>{filterType}</strong></>}
                            </p>
                            <button className="btn btn-sm btn-outline-primary"
                                onClick={() => { setSearchQuery(''); setFilterType('all') }}>Clear filters</button>
                        </div>
                    )}

                    {/* Data table — shows only the current page slice */}
                    {!loading && !fetchError && pageSlice.length > 0 && (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                {tableHead}
                                <tbody>
                                    {pageSlice.map((user) => {
                                        const isThisDeleting = deletingId === user._id

                                        return (
                                            <tr key={user._id} className="chat-single-item"
                                                style={{ opacity: isAnyDeleting && !isThisDeleting ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>

                                                {/* User */}
                                                <td>
                                                    <div className="d-flex align-items-center gap-3">
                                                        {hasValidImage(user.profileURL) ? (
                                                            <div className="avatar-image">
                                                                <Image width={38} height={38} sizes="100vw"
                                                                    src={`${process.env.NEXT_PUBLIC_S3_BASE_URL}${user.profileURL}`}
                                                                    alt={user.name || 'user'} className="img-fluid"
                                                                    style={{ objectFit: 'cover', borderRadius: '50%' }} />
                                                            </div>
                                                        ) : (
                                                            <div className="text-white avatar-text user-avatar-text">
                                                                {(user.name || '?').substring(0, 1).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="d-block fw-medium">
                                                                {user.name && user.name.length > 20 ? user.name.substring(0, 20) + '...' : user.name}
                                                                {user.displayName && user.displayName !== user.name && (
                                                                    <span className="text-muted fw-normal fs-11 ms-1">({user.displayName})</span>
                                                                )}
                                                            </span>
                                                            <span className="fs-12 d-block fw-normal text-muted">{user.email}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td><span className="badge bg-gray-200 text-dark">{user.rollNo || '—'}</span></td>
                                                <td><span className="fs-12">{user.organizationName || '—'}</span></td>
                                                <td><span className="fs-12">{user.branchName || '—'}</span></td>
                                                <td><span className="fs-12">{user.phoneNo || '—'}</span></td>

                                                <td>
                                                    <span className={`badge bg-soft-${getUserTypeColor(user.userType)} text-${getUserTypeColor(user.userType)}`}>
                                                        {user.userType || 'user'}
                                                    </span>
                                                </td>

                                                <td><span className="fs-12 text-muted">{formatDate(user.createdAt)}</span></td>

                                                {/* Actions */}
                                                <td className="text-end">
                                                    {isThisDeleting ? (
                                                        <div className="d-flex justify-content-center align-items-center">
                                                            <RotatingLines visible height="28" width="28" color="grey" strokeWidth="5" animationDuration="0.75" />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="position-relative d-inline-block"
                                                            ref={activeDropdown === user._id ? dropdownRef : null}
                                                        >
                                                            <button className="btn btn-sm btn-icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setActiveDropdown((prev) => prev === user._id ? null : user._id)
                                                                }}
                                                                disabled={isAnyDeleting}>
                                                                <FiMoreVertical size={16} />
                                                            </button>

                                                            {activeDropdown === user._id && (
                                                                <div className="position-absolute bg-white border rounded-2 shadow-sm py-1"
                                                                    style={{ right: 0, top: '100%', zIndex: 10, minWidth: 140 }}
                                                                    onClick={(e) => e.stopPropagation()}>
                                                                    <Link href={`/edit-users/${user._id}`}
                                                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 fs-12">
                                                                        <FiEdit size={13} /> Edit User
                                                                    </Link>
                                                                    <button
                                                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 fs-12 text-danger"
                                                                        onClick={() => handleDeleteUser(user._id)}>
                                                                        <FiTrash2 size={13} /> Delete User
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Footer: pagination ───────────────────── */}
                {!loading && !fetchError && users && users.length > 0 && pageSlice.length > 0 && (
                    <div className="card-footer py-3">
                        <UserPagination
                            currentPage={safePage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            from={from}
                            to={to}
                            onPageChange={(p) => setCurrentPage(p)}
                        />
                    </div>
                )}

                <CardLoader refreshKey={refreshKey} />
            </div>
        </div>
    )
}

export default ViewUsers