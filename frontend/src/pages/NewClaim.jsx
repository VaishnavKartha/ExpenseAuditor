import React, { useCallback, useState } from 'react'
import {useDropzone} from 'react-dropzone'
import axios from 'axios'
import {X} from 'lucide-react'
const NewClaim = () => {
    const [file,setFile]=useState(null)
    const [preview,setPreview]=useState(null)
    const [loading,setLoading]=useState(false)
    const[fileType,setFileType]=useState("");
    const [formData,setFormData]=useState({
        description:"",
        business_purpose:""
    })

    const onDrop = useCallback(acceptedFiles => {
    const file=acceptedFiles[0];
    
    try{
        if(file){
            setFile(file);
            setPreview(URL.createObjectURL(file))

            if(file.type.startsWith("image/")){
                setFileType("image")
            }else if(file.type.startsWith("application/")){
                setFileType("pdf")
            }
        }   

    }
    catch(err){
        console.log(err)
        setPreview(null);
        setFile(null);
        setFileType("");
    }
    
  }, [])
  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop,accept:{
        "image/jpeg":[],
        "image/png":[],
        "application/pdf":[]
    }})


    const handleChange=(e)=>{
        console.log("calling")
        const {name,value}=e.target;
        console.log(name,value)

        setFormData((prev)=>{
            return {...prev,[name]:value}
        })
    }


     const createClaim=async()=>{
        try{
            setLoading(true);

            if(!file || !formData.description){
                return
            }

            const formPayLoad= new FormData();
            formPayLoad.append('description',formData.description)
            formPayLoad.append("business_purpose","Meals")
            formPayLoad.append('file',file)
            
            const response=await axios.post("http://localhost:8000/claims/",formPayLoad)
            console.log(response)
        }catch(error){
            console.log(error)
        }finally{
            setLoading(false)
        }
    }


  //console.log(formData)
  return (
    <div className='mt-10 md:mt-20 flex flex-col gap-4 items-center h-full'>

        <h1 className='self-start text-4xl font-bold text-accent'>Create New Claim</h1>

        
        
            {!file && <div {...getRootProps()} className='border border-dashed border-gray-600 bg-gray-400/40 px-4 flex justify-center items-center rounded-full h-[30%]'>
                <input {...getInputProps()} accept='image/jpeg,image/png,application/pdf' 
                    />
                {
                    isDragActive ?
                    <p>Drop the files here ...</p> :
                    <p>Drag 'n' drop some files here, or click to select files</p>
                }
            </div>}

            <div className='relative w-[200px]'>
            {file && preview && fileType=="image" && <img src={preview} className='w-full'/>}
            {file && preview && fileType=="pdf" && <iframe src={preview} className='h-[600px] w-[70%]'/>}
            {file && <button onClick={()=>{
                setFile(null);
                setPreview(null);
                setFileType("");
            }} className='absolute z-10 cursor-pointer top-0 right-0'>
                <X/>
            </button>}
            </div>


            {
                file && 

                <div className='w-full md:w-[70%] mx-4'>
                    <textarea
                    className='w-full h-[200px] border border-gray-400'
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder='Give a brief description of the expense'/>
                </div>
            }

            {
                file && <button 
                onClick={createClaim}
                className='bg-accent rounded-full px-4 py-2 cursor-pointer text-white hover:bg-accent/80'>Upload</button>
            }

        

        

    </div>
  )
}

export default NewClaim