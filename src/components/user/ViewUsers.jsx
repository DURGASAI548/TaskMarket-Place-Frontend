'use client'
import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FiMoreVertical, FiEdit, FiTrash2, FiSearch, FiX, FiPlus, FiUser, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
import CardHeader from '@/components/shared/CardHeader'
import Pagination from '@/components/shared/Pagination'
import CardLoader from '@/components/shared/CardLoader'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'

const SkeletonRow = () => (
    <tr>
        <td>
            <div className="d-flex align-items-center gap-3">
                <div className="placeholder-glow">
                    <span
                        className="placeholder bg-secondary rounded-circle"
                        style={{ width: 38, height: 38, display: 'inline-block' }}
                    ></span>
                </div>
                <div>
                    <div className="placeholder-glow">
                        <span className="placeholder bg-secondary rounded" style={{ width: 120, height: 13, display: 'block' }}></span>
                    </div>
                    <div className="placeholder-glow mt-1">
                        <span className="placeholder bg-secondary rounded" style={{ width: 160, height: 10, display: 'block' }}></span>
                    </div>
                </div>
            </div>
        </td>
        <td>
            <div className="placeholder-glow">
                <span className="placeholder bg-secondary rounded" style={{ width: 70, height: 20, display: 'block', borderRadius: 10 }}></span>
            </div>
        </td>
        <td>
            <div className="placeholder-glow">
                <span className="placeholder bg-secondary rounded" style={{ width: 100, height: 13, display: 'block' }}></span>
            </div>
        </td>
        <td>
            <div className="placeholder-glow">
                <span className="placeholder bg-secondary rounded" style={{ width: 110, height: 13, display: 'block' }}></span>
            </div>
        </td>
        <td>
            <div className="placeholder-glow">
                <span className="placeholder bg-secondary rounded" style={{ width: 90, height: 13, display: 'block' }}></span>
            </div>
        </td>
        <td>
            <div className="placeholder-glow">
                <span className="placeholder bg-secondary rounded" style={{ width: 50, height: 20, display: 'block', borderRadius: 10 }}></span>
            </div>
        </td>
        <td>
            <div className="placeholder-glow">
                <span className="placeholder bg-secondary rounded" style={{ width: 80, height: 13, display: 'block' }}></span>
            </div>
        </td>
        <td className="text-end">
            <div className="placeholder-glow">
                <span className="placeholder bg-secondary rounded" style={{ width: 20, height: 20, display: 'inline-block' }}></span>
            </div>
        </td>
    </tr>
)

const ViewUsers = ({ title = 'Users' }) => {
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete: handleCardDelete } = useCardTitleActions()

    const [users, setUsers] = useState(null)
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState('')

    const [deletingId, setDeletingId] = useState(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState('all')

    const [activeDropdown, setActiveDropdown] = useState(null)

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

    useEffect(() => {
        fetchUsers()
    }, [])

    useEffect(() => {
        if (refreshKey) fetchUsers()
    }, [refreshKey])

    useEffect(() => {
        const handleClickOutside = () => setActiveDropdown(null)
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    const filteredUsers = useMemo(() => {
        if (!users) return null
        if (!searchQuery.trim()) return users

        const query = searchQuery.trim().toLowerCase()
        return users.filter((user) => {
            const name = (user.name || '').toLowerCase()
            const email = (user.email || '').toLowerCase()
            const org = (user.organizationName || '').toLowerCase()
            const branch = (user.branchName || '').toLowerCase()
            const roll = (user.rollNo || '').toLowerCase()
            const displayName = (user.displayName || '').toLowerCase()

            switch (filterType) {
                case 'name': return name.includes(query) || displayName.includes(query)
                case 'email': return email.includes(query)
                case 'org': return org.includes(query)
                case 'branch': return branch.includes(query)
                case 'roll': return roll.includes(query)
                default: return (
                    name.includes(query) ||
                    email.includes(query) ||
                    org.includes(query) ||
                    branch.includes(query) ||
                    roll.includes(query) ||
                    displayName.includes(query)
                )
            }
        })
    }, [users, searchQuery, filterType])

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

    const hasValidImage = (url) =>
        url && url !== 'null' && url !== 'undefined' && url.trim() !== ''

    const getUserTypeColor = (type) => {
        const t = (type || '').toLowerCase()
        // console.log(t)
        if (t === 'branchadmin') return 'primary'
        if (t === 'superadmin') return 'danger'
        if (t === 'orgadmin') return 'warning'
        return 'success'
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

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

                {!loading && !fetchError && users && users.length > 0 && (
                    <div className="card-header py-3 border-top">
                        <div className="row align-items-center g-2 w-100">
                            <div className="col-lg-5 col-6">
                                <div className="position-relative">
                                    <FiSearch
                                        size={14}
                                        className="text-muted position-absolute"
                                        style={{ left: 12, top: '50%', transform: 'translateY(-50%)' }}
                                    />
                                    <input
                                        type="text"
                                        className="form-control form-control-sm ps-5 pe-5"
                                        placeholder={
                                            filterType === 'name' ? 'Search by name...'
                                                : filterType === 'email' ? 'Search by email...'
                                                    : filterType === 'org' ? 'Search by organization...'
                                                        : filterType === 'branch' ? 'Search by branch...'
                                                            : filterType === 'roll' ? 'Search by roll number...'
                                                                : 'Search users...'
                                        }
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button
                                            className="btn btn-sm position-absolute border-0 p-0"
                                            style={{ right: 10, top: '50%', transform: 'translateY(-50%)' }}
                                            onClick={() => setSearchQuery('')}
                                        >
                                            <FiX size={14} className="text-muted" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="col-lg-5 col-md-4 col-5 d-flex gap-1 flex-wrap">
                                {[
                                    { key: 'all', label: 'All' },
                                    { key: 'name', label: 'Name' },
                                    { key: 'email', label: 'Email' },
                                    { key: 'org', label: 'Org' },
                                    { key: 'branch', label: 'Branch' },
                                    { key: 'roll', label: 'Roll No' },
                                ].map((f) => (
                                    <button
                                        key={f.key}
                                        className={`btn btn-xs ${filterType === f.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setFilterType(f.key)}
                                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            <div className="col-lg-2 col-md-2 text-end col-4">
                                <Link href="/add-users" className="btn btn-sm btn-primary">
                                    <FiPlus size={14} className="me-1" />
                                    Add User
                                </Link>
                            </div>
                        </div>

                        {searchQuery.trim() && filteredUsers && (
                            <div className="mt-2">
                                <span className="fs-11 text-muted">
                                    Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                    className="btn btn-sm btn-link text-decoration-none p-0 ms-2 fs-11"
                                    onClick={() => { setSearchQuery(''); setFilterType('all') }}
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="card-body custom-card-action p-0">

                    {loading && (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                {tableHead}
                                <tbody>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                        <SkeletonRow key={i} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && fetchError && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div
                                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10 mb-3"
                                style={{ width: 56, height: 56 }}
                            >
                                <FiAlertCircle size={24} className="text-danger" />
                            </div>
                            <h6 className="fw-bold mb-1 fs-13">Failed to load users</h6>
                            <p className="text-muted fs-12 mb-3 text-center" style={{ maxWidth: 320 }}>{fetchError}</p>
                            <button className="btn btn-sm btn-primary d-flex align-items-center" onClick={fetchUsers}>
                                <FiRefreshCw size={13} className="me-1" /> Try Again
                            </button>
                        </div>
                    )}

                    {!loading && !fetchError && (!users || users.length === 0) && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <div
                                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 mb-3"
                                style={{ width: 56, height: 56 }}
                            >
                                <FiUser size={24} className="text-primary" />
                            </div>
                            <h6 className="fw-bold mb-1 fs-13">No users yet</h6>
                            <p className="text-muted fs-12 mb-3">Get started by adding your first user.</p>
                            <Link href="/add-users" className="btn btn-sm btn-primary d-flex align-items-center">
                                <FiPlus size={13} className="me-1" /> Add User
                            </Link>
                        </div>
                    )}

                    {!loading && !fetchError && users && users.length > 0 && filteredUsers && filteredUsers.length === 0 && (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                            <FiSearch size={28} className="text-muted mb-3" />
                            <h6 className="fw-bold mb-1 fs-13">No users found</h6>
                            <p className="text-muted fs-12 mb-3 text-center" style={{ maxWidth: 320 }}>
                                No results for &quot;{searchQuery}&quot;
                                {filterType !== 'all' && <> in <strong>{filterType}</strong></>}
                            </p>
                            <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => { setSearchQuery(''); setFilterType('all') }}
                            >
                                Clear filters
                            </button>
                        </div>
                    )}

                    {!loading && !fetchError && filteredUsers && filteredUsers.length > 0 && (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                {tableHead}
                                <tbody>
                                    {filteredUsers.map((user) => {
                                        const isThisDeleting = deletingId === user._id

                                        return (
                                            <tr
                                                key={user._id}
                                                className="chat-single-item"
                                                style={{
                                                    opacity: isAnyDeleting && !isThisDeleting ? 0.5 : 1,
                                                    transition: 'opacity 0.2s ease',
                                                }}
                                            >
                                                <td>
                                                    <div className="d-flex align-items-center gap-3">
                                                        {hasValidImage(user.profileURL) ? (
                                                            <div className="avatar-image">
                                                                <Image
                                                                    width={38}
                                                                    height={38}
                                                                    sizes="100vw"
                                                                    src={`${process.env.NEXT_PUBLIC_S3_BASE_URL}${user.profileURL}`}
                                                                    alt={user.name || 'user'}
                                                                    className="img-fluid"
                                                                    style={{ objectFit: 'cover', borderRadius: '50%' }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="text-white avatar-text user-avatar-text">
                                                                {(user.name || '?').substring(0, 1).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="d-block fw-medium">
                                                                {user.name}
                                                                {user.displayName && user.displayName !== user.name && (
                                                                    <span className="text-muted fw-normal fs-11 ms-1">({user.displayName})</span>
                                                                )}
                                                            </span>
                                                            <span className="fs-12 d-block fw-normal text-muted">{user.email}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    <span className="badge bg-gray-200 text-dark">{user.rollNo || '—'}</span>
                                                </td>

                                                <td>
                                                    <span className="fs-12">{user.organizationName || '—'}</span>
                                                </td>

                                                <td>
                                                    <span className="fs-12">{user.branchName || '—'}</span>
                                                </td>

                                                <td>
                                                    <span className="fs-12">{user.phoneNo || '—'}</span>
                                                </td>

                                                <td>
                                                    <span className={`badge bg-soft-${getUserTypeColor(user.userType)} text-${getUserTypeColor(user.userType)}`}>
                                                        {user.userType || 'user'}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span className="fs-12 text-muted">{formatDate(user.createdAt)}</span>
                                                </td>

                                                <td className="text-end">
                                                    {isThisDeleting ? (
                                                        <RotatingLines visible height="18" width="18" color="grey" strokeWidth="5" animationDuration="0.75" />
                                                    ) : (
                                                        <div className="position-relative d-inline-block">
                                                            <button
                                                                className="btn btn-sm btn-icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setActiveDropdown(activeDropdown === user._id ? null : user._id)
                                                                }}
                                                                disabled={isAnyDeleting}
                                                            >
                                                                <FiMoreVertical size={16} />
                                                            </button>

                                                            {activeDropdown === user._id && (
                                                                <div
                                                                    className="position-absolute bg-white border rounded-2 shadow-sm py-1"
                                                                    style={{ right: 0, top: '100%', zIndex: 10, minWidth: 140 }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Link
                                                                        href={`/edit-user/${user._id}`}
                                                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 fs-12"
                                                                    >
                                                                        <FiEdit size={13} /> Edit User
                                                                    </Link>
                                                                    <button
                                                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 fs-12 text-danger"
                                                                        onClick={() => handleDeleteUser(user._id)}
                                                                    >
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

                {!loading && !fetchError && users && users.length > 0 && (
                    <div className="card-footer d-flex align-items-center justify-content-between">
                        <span className="fs-11 text-muted">
                            {filteredUsers?.length || 0} user{(filteredUsers?.length || 0) !== 1 ? 's' : ''}
                        </span>
                        <Pagination />
                    </div>
                )}

                <CardLoader refreshKey={refreshKey} />
            </div>
        </div>
    )
}

export default ViewUsers