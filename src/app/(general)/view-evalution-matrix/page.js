import React from 'react'
import dynamic from 'next/dynamic'
// import PageHeader from '@/components/shared/pageHeader/PageHeader'
// import ProposalEditHeader from '@/components/proposalEditCreate/ProposalEditHeader'
import ViewEvalutionMatrix from '@/components/evalution-matrix/ViewEvalutionMatrix'
// const ProposalSent = dynamic(() => import('@/components/proposalEditCreate/ProposalSent'), { ssr: false })
const page = () => {
    return (
        <>
            {/* <PageHeader>
                <ProposalEditHeader />
            </PageHeader> */}
            <div className='main-content'>
                <div className='row'>
                    <ViewEvalutionMatrix />
                </div>
            </div>
            {/* <ProposalSent /> */}
        </>
    )
}

export default page