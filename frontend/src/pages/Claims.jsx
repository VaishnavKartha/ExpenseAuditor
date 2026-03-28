import React from "react"
import { useState } from "react"
import expense from '../utils/demoexpense'
import NoClaim from "../components/NoClaim";
import ClaimFeatures from "../components/ClaimFeatures";
export default function Claims(){

    const [claims,setClaims]=useState(expense);

    

    return (

        <div className="min-h-screen max-md:px-4">

            <h1 className="font-bold text-4xl"><span>My</span> <span className="text-primary">Claims</span></h1>
             {claims.length == 0 ?
               <NoClaim/>:

                <ClaimFeatures claims={claims} setClaims={setClaims}/>

                }

        </div>
    )
    
        
    
}