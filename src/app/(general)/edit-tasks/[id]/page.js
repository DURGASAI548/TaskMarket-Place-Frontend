import React from 'react'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import ProposalEditHeader from '@/components/proposalEditCreate/ProposalEditHeader'
import EditTask from '@/components/Task/EditTask'
const page = () => {
    return (
        <>
            {/* <PageHeader>
                <ProposalEditHeader />
            </PageHeader> */}
            <div className='main-content'>
                <div className='row'>
                    <EditTask />
                </div>
            </div>
        </>
    )
}

export default page