import React from 'react'
import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div style={{height:'100%'}}>
        <div onClick={()=>{navigate('/stream')}}>Stream</div>
        <div onClick={()=>{navigate('/watch')}}>Watch</div>
    </div>
  )
}

export default Home