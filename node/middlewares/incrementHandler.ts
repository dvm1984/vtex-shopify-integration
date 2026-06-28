export function incrementHandler(n:number,array:any[],callbackFn:(n:number)=>{}){

    if(n+1<array.length) callbackFn(n+1)
    

}
