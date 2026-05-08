import React from 'react'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import ProposalEditHeader from '@/components/proposalEditCreate/ProposalEditHeader'
import AddEvalutionMatrix from '@/components/evalution-matrix/AddEvalutionMatrix'
const ProposalSent = dynamic(() => import('@/components/proposalEditCreate/ProposalSent'), { ssr: false })
const page = () => {
    return (
        <>
            {/* <PageHeader>
                <ProposalEditHeader />
            </PageHeader> */}
            <div className='main-content'>
                <div className='row'>
                    <AddEvalutionMatrix />
                </div>
            </div>
            <ProposalSent />
        </>
    )
}

export default page