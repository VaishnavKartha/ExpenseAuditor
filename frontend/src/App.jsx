import { useState } from 'react'
import {Routes,Route} from "react-router"
import Claims from './pages/Claims'
import Layout from './components/Layout'
import NewClaim from './pages/NewClaim'

function App() {
 

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout/>} >
          <Route index element={<Claims/>}/>
          <Route path="createclaim" element={<NewClaim/>}/>
        </Route>
      </Routes>
    </>
  )
}

export default App
