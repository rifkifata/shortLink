const express = require('express')
const app = express()
const async = require("async")
const db = require('@cyclic.sh/dynamodb')
const axios = require('axios')
const {
    param
} = require('express/lib/request')
const {
    get
} = require('express/lib/response')
const res = require('express/lib/response')
const now = new Date()
'use strict'

app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
})

app.post('/short/', async (req, res) => {
    console.log(Message("inProgress", "POST", ""))

    const col = "short"
    const shortedPath = req.body.shortedPath
    const sourcePath = req.body.sourcePath
    const author = req.body.author
    let validation
    let post

    if (!shortedPath) {
        res.status(404)
        res.json(ErrorMessage("emptyShortedPath")).end()
        console.log(ErrorMessage("emptyShortedPath"))
        validation = false
    }
    if (!sourcePath) {
        res.status(404)
        res.json(ErrorMessage("emptySourcePath")).end()
        console.log(ErrorMessage("emptySourcePath"))
        validation = false
    }

    const srcPathProtocol = await addProtocol(sourcePath)
    // Check duplicate
    const duplicate = await Get(col, shortedPath)
    if (duplicate.shortedPath == shortedPath) {
        res.status(404)
        res.json(ErrorMessage("failedPost")).end()
        console.log(ErrorMessage("failedPost"))
        validation = false
    }

    //check the url notfound
    const checkUrl = await CheckURL(srcPathProtocol)
    if (checkUrl == false) {
        res.status(404)
        console.log(ErrorMessage("failedUrl"))
        res.json(ErrorMessage("failedUrl")).end()
        validation = false
    }

    const body = {
        "sourcePath": srcPathProtocol,
        "shortedPath": shortedPath,
        "author": req.body.author ? author : null,
        "createdAt": now.toISOString(),
        "updatedAt": now.toISOString()
    }

    if (!validation == false) {
        post = await Post(col, shortedPath, body)
    }

    console.log(post)
    if (post.props.shortedPath) {
        res.status(200)
        res.json(post).end()
        console.log(SuccessMessage("successPost", shortedPath))
    } else {
        res.status(404)
        res.json(ErrorMessage("failedPost")).end()
        console.log(ErrorMessage("failedPost"))
    }
})

app.get('/short/:key', async (req, res) => {
    const col = "short"
    const key = req.params.key
    console.log(Message("inProgress", "GET", key))

    const get = await Get(col, key)

    if (get.shortedPath == key) {
        res.status(200)
        res.json(get).end()
        console.log(SuccessMessage("successGet", key))
    } else {
        res.status(404)
        res.json(ErrorMessage("failedGet")).end()
        console.log(ErrorMessage("failedGet"))
    }
})

app.delete('/short/:shortedPath', async (req, res) => {
    const key = req.params.shortedPath
    const col = "short"
    console.log(Message("inProgress", "DELETE", key))

    // Check Data
    const data = await Get(col, key)
    if (data.shortedPath == undefined) {
        res.status(404)
        res.json(ErrorMessage("failedGet")).end()
        console.log(ErrorMessage("failedGet"))
    }

    const del = await Delete("short", key)
    if (del == true) {
        res.status(200)
        res.json(SuccessMessage("successDelete", key)).end()
        console.log(SuccessMessage("successDelete", key))
    } else {
        res.status(404)
        res.json(ErrorMessage("failedDelete")).end()
        console.log(ErrorMessage("failedDelete"))
    }
})

app.get('/all/short', async (req, res) => {
    console.log(Message("inProgress", "GETALL", ""))
    const col = "short"
    const items = await GetAll(col)
    if (Array.isArray(items) && items.length) {
        res.status(200)
        res.json(items).end()
        console.log(SuccessMessage("successGetAll", col))
    } else {
        res.status(404)
        res.json(ErrorMessage("failedGetAll")).end()
        console.log(ErrorMessage("failedGetAll"))
    }
})

// Catch all handler for all other request.
app.use('*', (req, res) => {
    res.json({
        msg: 'no route handler found'
    }).end()
})

// Start the servers
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`index.js listening on ${port}`)
})

function ErrorMessage(err) {
    if (err == "emptyShortedPath") return {
        "message": "Shorted Path Cannot be Empty"
    }
    if (err == "emptySourcePath") return {
        "message": "Source Path Cannot be Empty"
    }
    if (err == "failedDelete") return {
        "message": "Failed to Delete, Data not Found"
    }
    if (err == "failedPost") return {
        "message": "Failed to Post, Shorted Link Already Exist"
    }
    if (err == "failedGet") return {
        "message": "Failed to Get, Data not Found"
    }
    if (err == "failedGetAll") return {
        "message": "Failed to Get All, no Data Found"
    }
    if (err == "failedUrl") return {
        "message": "URL Error"
    }
}

function Message(msg, progress, params) {
    if (msg == "inProgress") return {
        "message": `try to ${progress} ${params}`
    }
}

function SuccessMessage(msg, params) {
    if (msg == "successDelete") return {
        "message": "Success Delete " + params
    }
    if (msg == "successPost") return {
        "message": "Success Post " + params
    }
    if (msg == "successGet") return {
        "message": "Success Get " + params
    }
    if (msg == "successGetAll") return {
        "message": "Success Get All from Collection" + params
    }
}

async function Delete(col, key) {
    try {
        return await db.collection(col).delete(key)
    } catch (e) {
        return e.message
    }
}

async function Post(col, key, body) {
    try {
        //return await db.collection(col).set(key, body)
        const db =await db.collection(col).set(key, body)
        console.log(db)
    } catch (e) {
        //return e.message
        console.log(e.message)
    }
}

async function Get(col, key) {
    try {
        const item = await db.collection(col).get(key)
        let props = item.props
        delete props.updated
        delete props.created
        let newitem = {
            key: key,
            collection: col,
            ...props
        }
        console.log(newitem)
        return newitem
    } catch (e) {
        return e.message
    }
}

async function GetAll(col) {
    try {
        const items = await db.collection(col).list()

        let result = items.results.map(a => a.key)
        let currentArray = []

        await Promise.all(
            result.map(async (item) => {
                currentArray.push(await db.collection(col).get(item))
            })
        )

        currentArray.map(item => {
            Object.assign(item, item.props)
            delete item.props
            return item
        })

        return currentArray
    } catch (error) {
        return e.message
    }
}

async function CheckURL(path) {
    return axios({
        method: 'get',
        url: path,
    }).catch((error) => {
        console.log(error.status)
        return false
    })
}

async function addProtocol(path) {
    if (path.toString().toLowerCase().includes("https://") || path.toString().toLowerCase().includes("http://")) {
        return path
    } else return `https://${path}`
}