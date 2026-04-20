'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import PageHeaderDate from '@/components/shared/pageHeader/PageHeaderDate'
import SiteOverviewStatistics from '@/components/widgetsStatistics/SiteOverviewStatistics'
import PaymentRecordChart from '@/components/widgetsCharts/PaymentRecordChart'
import LeadsOverviewChart from '@/components/widgetsCharts/LeadsOverviewChart'
import TasksOverviewChart from '@/components/widgetsCharts/TasksOverviewChart'
import Project from '@/components/widgetsList/Project'
import Schedule from '@/components/widgetsList/Schedule'
import SalesMiscellaneous from '@/components/widgetsMiscellaneous/SalesMiscellaneous'
import LatestLeads from '@/components/widgetsTables/LatestLeads'
import TeamProgress from '@/components/widgetsList/Progress'
import { projectsDataTwo } from '@/utils/fackData/projectsDataTwo'
import DuplicateLayout from './duplicateLayout'
import { useAuthStore } from '@/store/useAuthStore'
import axios from 'axios'

const Home = () => {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const result = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/verify-token`,
          { withCredentials: true }
        )
        console.log(result)
        if (result.status === 200 && result.data.message === 'Valid token') {
          setVerifying(false)
        } else {
          logout()
          console.log("else",result)
          router.push('/authentication/login/minimal')
        }
      } catch (err) {
        console.error('Token verification failed:', err)
        logout()
        router.push('/authentication/login/minimal')
      }
    }
    verifyToken()
  }, [])

  if (verifying) {
    return (
      <DuplicateLayout>
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </DuplicateLayout>
    )
  }

  return (
    <DuplicateLayout>
      <div className='main-content'>
        <div className='row'>
          <SiteOverviewStatistics />
          <PaymentRecordChart />
          <SalesMiscellaneous isFooterShow={true} dataList={projectsDataTwo} />
          <TasksOverviewChart />
          <LeadsOverviewChart chartHeight={315} />
          <LatestLeads title={"Latest Leads"} />
          <Schedule title={"Upcoming Schedule"} />
          <Project cardYSpaceClass="hrozintioal-card" borderShow={true} title="Project Status" />
          <TeamProgress title={"Team Progress"} footerShow={true} />
        </div>
      </div>
    </DuplicateLayout>
  )
}

export default Home