'use client'
import React, { useState } from 'react'
import SelectDropdown from '@/components/shared/SelectDropdown'
import MultiSelectTags from '@/components/shared/MultiSelectTags'
import MultiSelectImg from '@/components/shared/MultiSelectImg'
import DatePicker from 'react-datepicker'
import useDatePicker from '@/hooks/useDatePicker'
import { propasalLeadOptions, propsalDiscountOptions, propsalRelatedOptions, propsalStatusOptions, propsalVisibilityOptions, taskAssigneeOptions, taskLabelsOptions } from '@/utils/options'
import { timezonesData } from '@/utils/fackData/timeZonesData'
import { currencyOptionsData } from '@/utils/fackData/currencyOptionsData'
import useLocationData from '@/hooks/useLocationData'
import Loading from '@/components/shared/Loading'
import topTost from '@/utils/topTost';
import { FiLayers, FiSave } from 'react-icons/fi'
import { RotatingLines } from 'react-loader-spinner'
import axios from 'axios'


// import AddProposal from './AddProposal'

const previtems = [
    {
        id: 1,
        product: "",
        qty: 0,
        price: 0
    },
]
const AddOrganization = () => {
    const HandleClick = async() => {
        setloading(true)
        try {
            const result = await axios.get("https://taskmarket-place-backend.onrender.com/api/login", {
                withCredentials: true
            })
            console.log(result)
            setloading(false)

            topTost("success", "API CALL DONE")

        }
        catch(err){
            setloading(false)
            topTost("error", "API CALL not DONE")
            console.log(err)
        }

    };
    const [selectedOption, setSelectedOption] = useState(null);
    const [loading, setloading] = useState(false)


    return (
        <>
            <div className="col-xl-8">
                <div className="card stretch stretch-full">
                    <div className="card-body">
                        <h5>Add Organization</h5>
                        <h6></h6>
                        <div>
                            <div className="row">
                                <div className="col-lg-6 mb-4">
                                    <label className="form-label">Organization Name <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control mb-2" placeholder="Org Name" />
                                </div>
                                <div className="col-lg-6 mb-4">
                                    <label className="form-label">Organization Admin <span className="text-danger">*</span></label>
                                    <SelectDropdown
                                        options={currencyOptionsData}
                                        selectedOption={selectedOption}
                                        defaultSelect="usd"
                                        onSelectOption={(option) => setSelectedOption(option)}
                                    />
                                </div>
                            </div>

                        </div>
                        <div>
                            <label className="form-label">Organization Description <span className="text-danger">*</span></label>
                            <div className="row">
                                <div className="col-lg-12 mb-8">
                                    <textarea rows={5} className="form-control" id="InvoiceAddress" placeholder="Enter Address" defaultValue={""} />
                                </div>
                            </div>
                        </div>
                        <div className='col-12 d-flex justify-content-end mt-4'>
                            <button className="btn btn-primary" onClick={HandleClick} disabled={loading}>
                                {
                                    loading ? <>
                                        <RotatingLines
                                            visible={true}
                                            height="30"
                                            width="30"
                                            color="white"
                                            strokeWidth="5"
                                            animationDuration="0.75"
                                            ariaLabel="rotating-lines-loading"
                                            wrapperStyle={{}}
                                            wrapperClass=""
                                        />
                                    </> :
                                        <>
                                            <FiSave size={16} className='me-2' />
                                            <span>Add Organization</span></>
                                }
                            </button>
                        </div>
                    </div>
                </div>

            </div>


        </>
    )
}

export default AddOrganization