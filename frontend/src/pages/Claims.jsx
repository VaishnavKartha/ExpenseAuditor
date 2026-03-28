import React from "react"
import { useState } from "react"
export default function Claims(){

    const [file,setFile] = useState(null)
    const [preview,setPreview] = useState(null)
    const [loading,setLoading] = useState(false)

    return <>
    
        <div className="text-red-500">Claims</div>
    </>
}