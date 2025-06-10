const asyncHandler = (fn) => async (req, res, next) => {
    try{
        await fn(req,res,next)
    }
    catch (error){
        res.status(error.code).json({
            sucess: false,
            message: error.message
        })
    }
}

export {asyncHandler}