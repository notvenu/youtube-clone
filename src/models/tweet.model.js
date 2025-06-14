import mongoose,{ Schema } from "mongoose";

const tweetScehma = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    content: {
        type: String,
        required: true
    }
}, {timestamps: true})

export const Tweet = mongoose.model("Tweet", tweetScehma)