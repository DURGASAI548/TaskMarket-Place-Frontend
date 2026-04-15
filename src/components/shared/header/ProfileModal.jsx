'use client'
import Image from 'next/image'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiLogOut, FiUser } from "react-icons/fi"
import { useAuthStore } from '@/store/useAuthStore'
import axios from 'axios'
import topTost from '@/utils/topTost'

const ProfileModal = () => {
    const router = useRouter();
    const { user, isLogged, logout } = useAuthStore();
    const [loggingOut, setLoggingOut] = useState(false);

    const hasValidAvatar = user?.avatar && user.avatar !== 'null' && user.avatar !== 'undefined' && user.avatar.trim() !== '';

    const avatarSrc = hasValidAvatar
        ? `${process.env.NEXT_PUBLIC_S3_BASE_URL}/${user.avatar}`.replace(/([^:]\/)\/+/g, '$1')
        : null;

    const AvatarImage = ({ size = 45 }) => (
        avatarSrc ? (
            <Image
                width={size}
                height={size}
                src={avatarSrc}
                alt={user?.name || 'user'}
                className="user-avtar me-0"
                style={{ objectFit: 'cover', borderRadius: '50%' }}
            />
        ) : (
            <div
                className="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle"
                style={{ width: size, height: size, fontSize: size * 0.4 }}
            >
                {user?.name ? user.name.charAt(0).toUpperCase() : <FiUser size={size * 0.4} />}
            </div>
        )
    );

    const handleLogout = async () => {
        if (loggingOut) return;
        try {
            setLoggingOut(true);
            await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/logout`,
                { withCredentials: true }
            );
            logout();
            router.push('/authentication/login/minimal');
        } catch (err) {
            console.error('Logout failed:', err);
            topTost?.('error', err?.response?.data?.message || 'Logout failed. Please try again.');
        } finally {
            setLoggingOut(false);
        }
    };

    if (!isLogged || !user) {
        return null;
    }

    return (
        <div className="dropdown nxl-h-item">
            <a href="#" data-bs-toggle="dropdown" role="button" data-bs-auto-close="outside">
                <AvatarImage size={45} />
            </a>
            <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-user-dropdown">
                <div className="dropdown-header">
                    <div className="d-flex justify-content-between">
                        <AvatarImage size={45} />
                        <div>
                            <h6 className="text-dark mb-0">
                                {user.name || 'User'}
                                <span className="badge bg-soft-success text-success ms-1">{user.role || ''}</span>
                            </h6>
                            <span className="fs-12 fw-medium text-muted">{user.email || ''}</span>
                        </div>
                    </div>
                </div>
                <button className="dropdown-item" onClick={handleLogout} disabled={loggingOut}>
                    <i><FiLogOut /></i>
                    <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
            </div>
        </div>
    )
}

export default ProfileModal