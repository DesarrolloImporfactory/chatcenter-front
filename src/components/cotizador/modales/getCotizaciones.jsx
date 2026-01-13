import { useEffect } from "react"
import { chatApi } from "../../../api/chatcenter"
 
 const getCotizaciones = () => {
  useEffect(() => {
      const fetchCotizaciones = async () => {
        try {
          const response = await chatApi.get('/cotizaciones')
          console.log('Cotizaciones:', response.data)
        } catch (error) {
          console.error('Error fetching cotizaciones:', error)
        } 
      }
      fetchCotizaciones()
  }, [])
   return (
     <>
       
     </>
   )
 }
 
 export default getCotizaciones
 