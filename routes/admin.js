const express = require('express');
const adminRouter = express.Router();
const db = require('../db');
const { constants } = require('../env');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config();

function executeQuery(statement){
    return new Promise((resolve, reject) => {
        db.query(statement, (error, data) => {
            if(error){
                reject(error);
            }else{
                resolve(data);
            }
        });
    });
};

//1
adminRouter.post('/register', async(request, response) => {
    try{
        const {firstName, lastName, emailId, password, mobNo} = request.body;
        const mobNoValue = typeof mobNo !== 'undefined' ? mobNo : null;

        var statement = `select id from users where (emailId = '${emailId}' or mobNo = '${mobNoValue}')`;
        var data = await executeQuery(statement);
        if(data.length !== 0){
            response.status(200).send({message: "email id or mobile number already registered"});
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = generatePassword(16);

        statement = `insert into users values('${id}', '${firstName}', '${lastName}', '${emailId}', 
         '${hashedPassword}', '${mobNoValue}')`;
        data = await executeQuery(statement);
        
        if(data){
            response.status(201).send({message: "registration successful."});
        }else{
            response.status(200).send({"error": "something went wrong"});
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//2
adminRouter.post('/login', async(request, response) => {
    try{
        const {emailId, password} = request.body;
        var statement = `call spLogin('${emailId}')`;
        var data = await executeQuery(statement);
        if(data[0][0].Message === 'user not found. please check your email id.'){
            response.status(200).send({"error": "user not found. please check your email id."});
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, data[0][0].password);
        if(!isPasswordValid){
            response.status(200).send({"error": "entered password is wrong"});
            return;
        }
        else{
            response.status(200).send({"message": "logged in successfully", "adminId": data[0][0].id});
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

function generatePassword(length) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset.charAt(randomIndex);
    }
  
    return password;
}

//3
adminRouter.post('/forgetPass', async(request, response) => {
    try{
        const { emailId } = request.body;
        const newPassword = generatePassword(constants.FORGET_PASSWORD_LENGHT);
        var statement = `select firstName, lastName from users where emailId = '${emailId}'`;
        var data1 = await executeQuery(statement);
        if(data1.length === 0){
            response.status(200).send({"error": "user not found. please check your email id."});
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        statement = `update users set password = '${hashedPassword}' 
                    where emailId = '${emailId}'`;
        data2 = await executeQuery(statement);

        if(data2.affectedRows === 0){
            response.status(200).send({"error": "something went wrong"});
        }else{
            const mailid = request.body.emailId;
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_ADDRESS,
                    pass: process.env.GMAIL_PASSWORD
                }
            });

    const message = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            color: #ff3300;
        }
        .content {
            margin-bottom: 20px;
        }
        .content p {
            line-height: 1.6;
        }
        .footer {
            text-align: center;
            font-size: 0.9em;
            color: #777;
        }
        .footer a {
            color: #007BFF;
            text-decoration: none;
        }
        .password{
            font-size: 2rem;
        }
        .emotion{
            font-style: italic;
            color: rgb(232, 110, 110);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Dear ${data1[0].firstName} ${data1[0].lastName},</p>
            <p>We received a request to reset your password. Here is your temporary password:</p>
            <p class="password"><strong>${newPassword}</strong></p>
            <p class="emotion">Copy paste karlo! Password lamba hai, yad nahi rahega.</p>
            <p>Please use this password to log in and change your password to something more secure.</p> 
            <p>If you did not request a password reset, please ignore this email.</p>

        </div>
        <div class="footer">
            <p>Thank you,<br>The [Your Company Name] Team</p>
            <p><a href="[Your Company Website]">Visit our website</a></p>
        </div>
    </div>
</body>
</html>
`;

            const mailOptions = {
                from: process.env.GMAIL_ADDRESS,
                to: mailid,
                subject: 'Password Reset Request',
                html: message,
            };

            transporter.sendMail(mailOptions, (error, info) =>{
                if(error){
                    response.status(500).send({error:'Internal Server Error'});
                }else{
                    response.status(200).send({"message": "password sent via email"});
                }
            });
        }

    }catch(error){
        response.status(400).send({"error": error});
    }
});

//4
adminRouter.post('/getAdminProfile', async(request, response) => {
    try{
        const {adminId} = request.body;
        var statement = `select firstName, lastName, emailId, mobNo from users where id = '${adminId}'`;
        var data = await executeQuery(statement);

        if(data.length === 0){
            response.status(200).send({"error": "Admin id does not exists"});
        }else{
            response.status(200).send(data);
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//5
adminRouter.post('/updateProfile', async(request, response) => {
    try{
        const {adminId, firstName, lastName, emailId, mobNo} = request.body;
        const mobNoValue = typeof mobNo !== 'undefined' ? mobNo : null;
        var statement = `call spUpdateAdminProfile('${adminId}', '${firstName}', '${lastName}', '${emailId}', '${mobNoValue}')`;
        var data = await executeQuery(statement);

        if(data[0][0].Message === "Profile updated"){
            response.status(200).send({"message": "Profile updated"});
        }else if(data[0][0].Message === "Admin id does not exists"){
            response.status(200).send({"error": "Admin id does not exists"});
        }else{
            response.status(400).send({"error": "something went wrong"});
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//6
adminRouter.post('/updatePassword', async(request, response) => {
    try{
        const {adminId, oldPassword, newPassword} = request.body;
        var statement = `call spGetAdminPassword('${adminId}')`;
        var data = await executeQuery(statement);

        if(data[0][0].Message === 'admin id not found'){
            response.status(200).send({"error": "admin id not found"});
            return;
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, data[0][0].password);
        if(!isPasswordValid){
            response.status(200).send({"error": "old password is wrong"});
            return;
        }
        else{
            var hashedNewPassword = await bcrypt.hash(newPassword, 10);
            statement = `call spUpdateAdminPassword('${adminId}', '${hashedNewPassword}')`;
            data = await executeQuery(statement);
            if(data[0][0].Message === "password updated"){
                response.status(200).send({"message": "Password updated successfully"});
            }else{
                response.status(400).send({"error": "something went wrong"});
            }
        }
        
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//7
adminRouter.post('/checkForAdminId', async(request, response) => {
    try{
        const {adminId} = request.body;
        var statement = `call spCheckForAdminId('${adminId}')`;
        var data = await executeQuery(statement);

        if(data[0][0].Message === "true"){
            response.status(200).send({"message": "true"});
        }else if(data[0][0].Message === "false"){
            response.status(200).send({"message": "false"});
        }else{
            response.status(400).send({"error": "something went wrong"});
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//8
adminRouter.get('/getAllStaticContents', async(request, response) => {
    try{
        var statement = `select id, contentName, contentValue from staticcontent`;
        var data = await executeQuery(statement);

        if(data.length === 0){
            response.status(200).send({"error": "static contents not available"});
            return;
        }
        else{
            response.status(200).send(data);
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//9
adminRouter.post('/getStaticContentBtId', async(request, response) => {
    try{
        var {contentId} = request.body;
        var statement = `select contentName, contentValue from staticcontent where id = ${contentId}`;
        var data = await executeQuery(statement);

        if(data.length === 0){
            response.status(200).send({"error": "static content not available"});
            return;
        }
        else{
            response.status(200).send(data);
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//10
adminRouter.post('/updateStaticContentById', async(request, response) => {
    try{
        var {contentId, contentValue} = request.body;
        var statement = `call spUpdateStaticContent(${contentId}, '${contentValue}')`;
        var data = await executeQuery(statement);

        if(data[0][0].Message === 'Static content updated'){
            response.status(200).send({"message": "content updated successfully"});
        }
        else{
            response.status(200).send({"error": "error occured while updating static content"});
            return;
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//11
adminRouter.get('/getAllFolders', async(request, response) => {
    try{
        var statement = `WITH RankedImages AS (
                            SELECT f.id AS folderId, f.folderName, i.imageUrl,
                                ROW_NUMBER() OVER (PARTITION BY f.id ORDER BY i.createdDatetime DESC) AS rn
                            FROM folders f LEFT JOIN imagedata i ON f.id = i.folder
                        )
                        SELECT folderId, folderName, imageUrl FROM RankedImages
                        WHERE rn <= 3`;
        var data = await executeQuery(statement);

        if(data.length === 0){
            response.status(200).send({"error": "folders not available"});
            return;
        }
        else{
            response.status(200).send(data);
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//12
adminRouter.post('/addFolder', async(request, response) => {
    try{
        var {folderName} = request.body;
        var statement = `call spAddFolder('${folderName}')`;
        var data = await executeQuery(statement);

        if(data[0][0].Message === 'Folder added'){
            response.status(200).send({"message": "folder added successfully"});
            return;
        }
        else if(data[0][0].Message === 'Folder already exists'){
            response.status(200).send({"error": "this folder name already exsists"});
            return;
        }
        else{
            response.status(200).send({"error": "error occured while adding folder"});
            return;
        }
    }catch(error){
        if(error.code === 'ER_DUP_ENTRY'){
            response.status(200).send({"error": "this folder name already exsists"});
            return;
        }
        response.status(400).send({"error": error});
    }
});

//13
adminRouter.post('/updateFolderNameById', async(request, response) => {
    try{
        var {folderId, folderName} = request.body;
        var statement = `call spUpdateFolderName(${folderId}, '${folderName}')`;
        var data = await executeQuery(statement);
        if(data[0][0].Message === 'Folder updated'){
            response.status(200).send({"message": "folder name updated successfully"});
            return;
        }
        else if(data[0][0].Message === 'Folder name already exists'){
            response.status(200).send({"error": "this folder name already exsists"});
            return;
        }
        else if(data[0][0].Message === 'Folder id does not exist'){
            response.status(200).send({"error": "error occured while updating folder name"});
            return;
        }
        else{
            response.status(200).send({"error": "error occured while updating folder name"});
            return;
        }
    }catch(error){
        if(error.code === 'ER_DUP_ENTRY'){
            response.status(200).send({"error": "this folder name already exsists"});
            return;
        }
        response.status(400).send({"error": error});
    }
});

//14
adminRouter.post('/getImagesByFolder', async(request, response) => {
    try{
        var {folderName} = request.body;
        var statement = `select i.id imageId, i.imageUrl from folders f, imagedata i
                            where f.id = i.folder and f.folderName = '${folderName}'`;
        var data = await executeQuery(statement);

        if(data.length === 0){
            response.status(200).send({"error": "images are not available"});
            return;
        }
        else{
            response.status(200).send(data);
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//15
adminRouter.post('/deleteFolderByName', async(request, response) => {
    try{
        var {folderName} = request.body;
        var statement = `delete from imagedata where folder = (select id from folders where folderName = '${folderName}')`;
        var data = await executeQuery(statement);

        statement = `delete from folders where folderName = '${folderName}'`;
        data = await executeQuery(statement);

        if(data.affectedRows === 0){
            response.status(200).send({"error": "something went wrong while deleting folder"});
            return;
        }
        else{
            response.status(200).send(data);
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//16
adminRouter.post('/deleteImageById', async(request, response) => {
    try{
        var {imageId} = request.body;
        var statement = `delete from imagedata where id = ${imageId}`;
        var data = await executeQuery(statement);

        if(data.affectedRows === 0){
            response.status(200).send({"error": "something went wrong while deleting image"});
            return;
        }
        else{
            response.status(200).send(data);
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

//17
adminRouter.post('/addImageToFolder', async(request, response) => {
    try{
        var {folderName, imageUrl} = request.body;
        var statement = `select id from folders where folderName = '${folderName}'`;
        var data = await executeQuery(statement);
        
        statement = `insert into imagedata(folder, imageUrl) values(${data[0].id}, '${imageUrl}')`;
        data = await executeQuery(statement);

        if(data.affectedRows === 0){
            response.status(200).send({"error": "something went wrong while adding image"});
            return;
        }
        else{
            response.status(200).send(data);
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

module.exports = adminRouter;