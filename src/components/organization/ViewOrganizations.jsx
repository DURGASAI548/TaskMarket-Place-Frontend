'use client'
import React, { useState, useEffect, useRef } from 'react'
import topTost from '@/utils/topTost'
import { RotatingLines } from 'react-loader-spinner'
import Image from 'next/image'
import axios from 'axios'
import Link from 'next/link'
import { FiMoreVertical } from 'react-icons/fi'
import { BsPatchCheckFill } from 'react-icons/bs'
import { FiEdit, FiMail, FiMapPin, FiPhone, FiTrash2 } from 'react-icons/fi'

const ViewOrganizations = () => {
    const [OrganizationData, setOrganizationData] = useState(null)
    useEffect(() => {
        const FetchData = async () => {
            try {
                const Result = await axios.get(process.env.NEXT_PUBLIC_API_URL + "/api/get-organizations", {
                    withCredentials: true
                })
                console.log(Result)
                setOrganizationData(Result.data.data)
            }
            catch (err) {
                console.log(err)
            }
        }
        FetchData()
    }, [])
    return (
        <>
            {
               OrganizationData &&  OrganizationData.map(ele => {
                    return <div className='d-flex flex-wrap'>
                        <div className="col-lg-4 col-md-6 col-12">
                            <div className='card col-11'>
                                <div className="card-body">
                                    <div className="mb-4 text-center">
                                        {/* <div className="wd-150 ht-150 mx-auto mb-3 position-relative">
                            <div className="avatar-image wd-150 ht-150 border border-5 border-gray-3">
                                <Image width={140} height={140} sizes='100vw' src="/images/avatar/1.png" alt="img" className="img-fluid" />
                            </div>
                            
                        </div> */}

                                        <div className="fs-12 fw-normal text-muted text-center d-flex flex-wrap gap-3 mb-4">
                                            <div className="flex-fill py-3 px-4 rounded-1 d-none d-sm-block border border-dashed border-gray-5">
                                                <h6 className="fs-15 fw-bolder">45</h6>
                                                <p className="fs-12 text-muted mb-0">Branchs</p>
                                            </div>
                                            <div className="flex-fill py-3 px-4 rounded-1 d-none d-sm-block border border-dashed border-gray-5">
                                                <h6 className="fs-15 fw-bolder">180</h6>
                                                <p className="fs-12 text-muted mb-0">Users</p>
                                            </div>
                                            <div className="flex-fill py-3 px-4 rounded-1 d-none d-sm-block border border-dashed border-gray-5">
                                                <h6 className="fs-15 fw-bolder">12</h6>
                                                <p className="fs-12 text-muted mb-0">Tasks</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* <ul className="list-unstyled mb-4">
                        <li className="hstack justify-content-between mb-4">
                            <span className="text-muted fw-medium hstack gap-3"><FiMapPin size={16} />Location</span>
                            <a href="#" className="float-end">California, USA</a>
                        </li>
                        <li className="hstack justify-content-between mb-4">
                            <span className="text-muted fw-medium hstack gap-3"><FiPhone size={16} />Phone</span>
                            <a href="#" className="float-end">+01 (375) 2589 645</a>
                        </li>
                        <li className="hstack justify-content-between mb-0">
                            <span className="text-muted fw-medium hstack gap-3"><FiMail size={16} />Email</span>
                            <a href="#" className="float-end">alex.della@outlook.com</a>
                        </li>
                    </ul> */}
                                    <div className="d-flex gap-2 text-center pt-4">
                                        <a href="#" className="w-50 btn btn-light-brand">
                                            <FiTrash2 size={16} className='me-2' />
                                            <span>Delete</span>
                                        </a>
                                        <a href={`/edit-organizations/${ele._id}`} className="w-50 btn btn-primary">
                                            <FiEdit size={16} className='me-2' />
                                            <span>Edit Profile</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                })
            }


        </>
    )
}

export default ViewOrganizations;