const port = 2000;
const name = "nude";


const admin_user_ids = [499137012,485143895];
const group_id = 186249074;
const secret ="321c7a26";

const express = require('express');
const path = require('path');
const app = express().use(express.json());
const bodyParser = require('body-parser');

const public_dir=path.join(__dirname, 'public');
app.get('/', function(req, res) {
    res.sendFile(path.join(public_dir, 'index.html'));
});
app.use('/', express.static(public_dir));


const max_free_orders = 5;





app.use(bodyParser.urlencoded({
    extended: true
}));


const fs = require('fs');

/*** Объекты данных ***/
const MessageNew = require("../lib/vk/models/MessageNew");
const VKPayTransaction = require("../lib/vk/models/VKPayTransaction");

/*** API ***/
const APIVK = require("../lib/vk/API");
const api_vk=new APIVK(["2132806a0e1375a92e4b0d029085219b996091cb9ac5260a782d723edc0e9005de95f9b266ec9a5ddb6f3"]);

const APIOK = require("../lib/ok/API");
const api_ok=new APIOK("tkn1Ai1Zh1wTgnodhutugg8tHJ4Spg6EnacQrjkm2bp0IW72buiq6JIPgtNvRqqsZI7Ul:CBAOIJFNEBABABABA");

/*** База ***/
const DB = require("../lib/db/DB");
const db = new DB(name);
const DBUser = require("../lib/db/models/User");
const DBOrder = require("../lib/db/models/Order");

/*** Клавиатуры ***/
const Keyboard= require("../lib/vk/models/Keyboard");
const keyboard_data= JSON.parse(fs.readFileSync(__dirname+"/keyboard_new.json", 'utf8'));


const exec = require('child_process').exec;

const AnyPay = require('../lib/any_pay/AnyPay');
const any_pay= new AnyPay(4419, "UVQHrFcjZVNEckQMEEORqWpb8XeSw", "u7sEY7wu8cA5yvefbQSyQWsjiN6wHzQQ5iCriSy");

const PRICE=1;







/*** Запрос ***/












app.post("/anypay_notif", async function (req, res) {
    //console.log("anypay_notif");
    //let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //if (ip.substr(0, 7) === "::ffff:") ip = ip.substr(7);
    //if(ip!=="185.162.128.88")  return res.send("ip error:"+ip);


    let user_id=Math.floor(req.body.pay_id);
    let amount=Math.floor(req.body.amount);
    let method=req.body.method;




    let valid = any_pay.valid(req.body.amount,req.body.pay_id,req.body.sign);
    if(!valid){
        res.send("Error signature");
        return;
    }


    /** Бонусы */
    let bonus=0;



    let tarifs=keyboard_data.buttons;
    for(let i in tarifs){
        let tarif = tarifs[i];
        console.log(tarif);
        if(tarif.price){
            console.log(Math.floor(tarif.price),"===",amount);
            if( Math.floor(tarif.price)===Math.floor(amount)) {
                console.log("bonus=",tarif.balance," - ", tarif.price);
                bonus = tarif.balance - tarif.price;
            }
        }
    }


    console.log("amount",amount);
    console.log("bonus",bonus);




    let time= Math.round(new Date().getTime()/1000);
    let user = await db.user_get(user_id);


    if(user !== null) {
        user.balance+=(amount+bonus);
        await user.save();

        await api_vk.messages_send(user_id,                     user_id + user_id + time,   "Баланс пополнен на "+amount+" RUB"+(bonus>0?"\n+ Бонус "+bonus+" RUB":"")+" \nБаланс: "+user.balance+" ОБРАБОТОК", null);


        console.log(user_id, user_id + user_id + time, "Баланс пополнен на "+amount+" RUB"+(bonus>0?"\n+ Бонус "+bonus+" ОБРАБОТОК":"")+" \nБаланс: "+user.balance+" ОБРАБОТОК", null, null);



        let balance = '?';// await any_pay.balance();


        await api_vk.messages_send(admin_user_ids.join(","),    user_id+time,               "Баланс пополнен\n"+amount+" RUB *id"+user_id+"\nhttps://vk.com/gim"+group_id+"?sel="+user_id+"\nБаланс:"+balance+" RUB 💪🏻 ("+method+")", null);
    }


    res.send("ok");


})

app.post("/anypay_success", async function (req, res) {
    console.log("anypay_success",req.body);
    res.end("ok");
})

app.post("/anypay_error", async function (req, res) {
    console.log("anypay_error",req.body);
//
    res.end("ok");
});


let send_notifications=false;
app.get("", async function (req, res) {

    if(send_notifications)return;
    send_notifications=true;
    //let users = await DBUser.find({},{user_id:1,_id:0});
    let users = await DBUser.find({ /*unsubscribed:false,*/user_id:{$nin:[450609302]}},{user_id:1,_id:0});
    //let users=[{user_id:admin_user_ids[0]}];
    // users.unshift({user_id:admin_user_ids[0]});

    let total = users.length;

    //console.log("total",total);
//

    while(users.length>0) {
        let uids100 = [];
        while (uids100.length < 100 && users.length) {
            uids100.push(users[0].user_id);
            users.shift();
            console.log( uids100.length + "/" + total);
            res.write("Send " + uids100.length + "/" + total+"::: "+users.length+"\n");
        }

        res.write("SENDED " + uids100.length + "/" + total+" "+uids100.join(",")+"\n");
        let keyboard = new Keyboard(keyboard_data, "notification");


        await DBUser.updateMany({user_id:{$in:uids100}},{$set:{last_action:"balance"}});


        let sended=await api_vk.messages_send(uids100.join(","), Math.round(new Date().getTime() / 1000), keyboard.toString(), keyboard.attachment ? keyboard.attachment : "", keyboard);
        console.log(JSON.stringify(sended.data));
    }

    send_notifications=false;

    res.end("END");
});



app.get("/ok_subscribe",async function (req, res) {
    let result=await api_ok.messages_subscribe("http://nude.publes.ru/bot_ok");
    console.log(result.data);
    res.end(JSON.stringify(result.data));
    //res.send(result);
});

app.get("/ok_subscriptions",async function (req, res) {
    let result=await api_ok.messages_subscriptions();
    console.log(result.data);
    res.end(JSON.stringify(result.data));
    //res.send(result);
});


app.all("/bot_ok", async function (req, res) {
    console.warn(JSON.stringify(req.body));


    let id = req.body.recipient.chat_id;
    let text = req.body.message.text;
    let user_id = req.body.sender.user_id.split(":")[1];
    let first_name = req.body.sender.name.split(" ")[0];
    let payload_id = Number.parseInt(text);
    if (isNaN(payload_id)) payload_id=0;
    let photo_url = req.body.message.attachments?req.body.message.attachments[0]?req.body.message.attachments[0].type==="IMAGE"?req.body.message.attachments[0].payload.url:"":"":"";


    onChat(id, text, user_id, payload_id, photo_url, first_name, "ok");
    console.log(id, text, user_id, payload_id, photo_url, first_name, "ok");

    res.end("ok");

});


app.all("/bot_vk", async function (req, res) {
    // console.warn(req.body.type, req.body);
    if (req.body.type === "confirmation") {
        res.send(secret);
        return;
    }

    //test
    switch (req.body.type) {
        case "vkpay_transaction":
            let vkpay_transaction = new VKPayTransaction(req.body.object);
            break;
        case "group_join":
            db.group_join(req.body.object.user_id, true, api_vk);
            break;
        case "group_leave":
            db.group_join(req.body.object.user_id, false, api_vk);
            break;
        case "message_allow":
            db.message_allow(req.body.object.user_id, true, api_vk);
            break;
        case "message_deny":
            db.message_allow(req.body.object.user_id, false, api_vk);
            break;
        case "message_reply":

            let m = new MessageNew(req.body.object);
            if(  m.text.split("#")[0]==="notification") notification(m);

            break;
        case "message_new":
            let message = new MessageNew(req.body.object);
            let id = message.id;
            let text = message.text;
            let user_id = message.from_id;
            let payload_id = message.payload_id;
            let photo_url = message.get_attachment_photo(500);



            if(text==="/stop_notification") {

                let keyboard=new Keyboard(keyboard_data,"first");
                let user = await db.user_get(user_id);
                user.unsubscribed=true;
                await user.save();
                api_vk.messages_send(user_id,id,"Вы отписались от рассылок. Хотите вернуться - пишите.","",keyboard,null,1);
            }else{
                onChat(id, text, user_id, payload_id, photo_url, null, "vk");
            }
            /*if(user_id===499137012)
            else onChat(id, text, user_id, payload_id, photo_url, null, false);*/
            break;
    }
    res.send("ok");
});








async function onChat(id,text,user_id,payload_id,photo_url,first_name=null, social_network="vk") {
    let user = await db.user_get(user_id);
    if(user === null) {
        user = new DBUser({user_id:user_id});
        user.reg_time=Math.round(new Date().getTime()/1000);
        if(!first_name) {
            let new_user = await api_vk.users_get(user_id);
            first_name = new_user.first_name;
            user.first_name=first_name;
        }
    }

    user.message_allow = true;
    user.unsubscribed=false;
    user.soc=social_network;
    user.messages_num++;





    let keyboard=new Keyboard(keyboard_data,"first");


    let title="";

    // console.log("user.last_action=",user.last_action);
    if(user.last_action==="") user.last_action="first";






    let prev_keyboard = new Keyboard(keyboard_data, user.last_action);

    // console.log("prev_keyboard",JSON.stringify(prev_keyboard));

    if(text==="6969" || text==="1987" || text==="7777") {
       // title="КОД ПРИНЯТ!";
       // keyboard = new Keyboard(keyboard_data,"first");

        let tarif = {    };
        if(text==="6969")tarif = { "id":1, "to":"balance_info",  "color" : "secondary",  "type" : "text",  "label" : "9 ОБРАБОТОК за 69р",    "currency":"RUB", "amount":"69.0",   "price":69,    "balance":9    };
        if(text==="7777")tarif = { "id":1, "to":"balance_info",  "color" : "secondary",  "type" : "text",  "label" : "100 ОБРАБОТОК за 999р",    "currency":"RUB", "amount":"69.0",   "price":69,    "balance":9    };
        if(text==="1987")tarif = { "id":1, "to":"balance_info",  "color" : "secondary",  "type" : "text",  "label" : "БЕЗЛИМИТНОЕ КОЛЛИЧЕСТВО ОБРАБОТОК за 1990р",    "currency":"RUB", "amount":"1990.0",   "price":1990,    "balance":1000000    };


        let desc = "Оплата за обработку фотографий с помощью нейросети";
        let url = "https://any-pay.org/merchant?merchant_id=" + any_pay.project_id + "&amount=" + tarif.amount + "&pay_id=" +  user_id + "&desc=" + desc + "&sign=" + any_pay.sign(tarif.currency, tarif.amount,  user_id);
        let short_url = await api_vk.utils_getShortLink(url);
        title="💥💫💥💫КОД ПРИНЯТ!💥💫💥💫" +
            "\n\n Акция - "+tarif.label+
            "\n\nВаша ссылка для пополнения "+Math.floor(tarif.amount)+" RUB\n\n 👉 " + short_url ;

    }

    else

  if( prev_keyboard.valid ){
        let pressed_btn = prev_keyboard.getButtonById(payload_id);
        if(pressed_btn){

            //console.log("pressed_btn",pressed_btn);

            let current_location = pressed_btn.action.payload.to;
            keyboard = new Keyboard(keyboard_data,current_location);

            console.log("current_location",current_location);

            if(current_location==="balance"){
                title="Ваш баланс: "+user.balance+" ОБРАБОТОК\n";
                title+='БЕСПЛАТНЫХ АРТ ОБРАБОТОК: '+(max_free_orders - user.free_orders);
                keyboard.one_time=false;
            }





            if(current_location.indexOf("balance_info")>-1){
                let tarif = prev_keyboard.getButtonSrcById(payload_id);
                let bonus=tarif.balance-tarif.price;
                let desc = "Оплата за обработку фотографии с помощью нейросети";
                let url = "https://any-pay.org/merchant?merchant_id=" + any_pay.project_id + "&amount=" + tarif.amount + "&pay_id=" +  user_id + "&desc=" + desc + "&sign=" + any_pay.sign(tarif.currency, tarif.amount,  user_id);
                let short_url = await api_vk.utils_getShortLink(url);
                title="Ваша ссылка для пополнения "+Math.floor(tarif.amount)+" RUB\n\n 👉 [ " + short_url + (bonus>0?" ] 👈🏻\n\n Пополните сегодня и получите еще "+bonus+" RUB на счет в подарок!":"");
            }






            if(user.last_action==="nude"){




                if(photo_url) {
                    if(user.balance<PRICE) {

                        current_location="balance_need";
                        title="🧾 Ваш баланс: "+user.balance+" ОБРАБОТОК";
                        keyboard = new Keyboard(keyboard_data,"balance_need");
                        keyboard.attachment=["doc-186249074_527718704","doc-186249074_527719047","doc-186249074_527719065","doc-186249074_527719083"][Math.floor(Math.random()*4)]

                    }else if(user.order){

                        /*** Если просят обработку но у них уже есть заказ ***/
                        await api_vk.messages_send(
                            user_id,id,
                            "✋🏻 Уже есть от вас задание, сперва дождитесь его выполнения!\n\n",
                            null, new Keyboard(keyboard_data, "first"));
                        return;

                    } else {

                        title = "✅ Принято! Ожидайте...";
                        user.order = new DBOrder(
                            {
                                time: Math.round(new Date().getTime() / 1000),
                                action: [0],
                                params: [photo_url]
                            });
                        keyboard = new Keyboard(keyboard_data, "first",false);
                    }
                } else {
                    title = "🚫 Фото не получено.";
                    keyboard = new Keyboard(keyboard_data,"first");
                }
            }


            else if(user.last_action==="nude_free"){

                /*** Если просят обработку но у них уже есть заказ ***/
                if(user.order){
                    await api_vk.messages_send( user_id,id, "✋🏻 Уже есть от вас задание, сперва дождитесь его выполнения!\n\n", null, new Keyboard(keyboard_data, "first"));
                    return;
                }


                if(photo_url) {

                    let free = user.free_orders < max_free_orders;


                    if(free){
                        user.free_orders ++;
                    }




                    if(user.balance<PRICE && !free) {
                        current_location="balance_need";
                        title="Ваш баланс: "+user.balance+" ОБРАБОТОК";
                        keyboard = new Keyboard(keyboard_data,"balance_need");
                    }else{
                        title = free ? "БЕСПЛАТНАЯ ОБРАБОТКА!\nПринято! Ожидайте..." : "Принято! Ожидайте...";
                        user.order = new DBOrder({time: Math.round(new Date().getTime() / 1000), action: [1], params: [photo_url,free]});
                        keyboard = new Keyboard(keyboard_data, "first",false);
                    }

                } else {
                    title = "🚫 Фото не получено.";
                    keyboard = new Keyboard(keyboard_data,"first");
                }
            }


            user.last_action = current_location;
        }else{
            user.last_action = "first";
            console.error("no pressed button",payload_id)
        }
    }else {
        console.error("not valid")
    }

    await user.save();


    if(keyboard) for(let col of keyboard.buttons){
        for( let line of col){
            if(line.action && line.action.type==="text" && line.action.payload.to==="nude_free")
                if(max_free_orders-user.free_orders>0)
                    line.action.label+=" | БЕСПЛАТНО:"+(max_free_orders-user.free_orders);
        }

    }


    if(keyboard) {
        if (social_network === "vk")  await api_vk.messages_send(user_id, id, title + "\n\n" + keyboard.toString(), keyboard.attachment, keyboard,null,1);
        if (social_network === "ok")  await api_ok.messages_send(user_id, id, title + "\n\n" + keyboard.toString(), keyboard.attachment, keyboard);

    }else console.error("ERR! KEYBOARD NONE");


}





async function loop(){
    try {

        let user = await DBUser.find({order: {$ne: null}}).sort({/*'order.action':1, */'order.time': 1}).limit(1);
        if(user[0])user=user[0];

        if (!user) {
            setTimeout(loop, 1000);
            return;
        }

        if(!user.order){
            setTimeout(loop, 1000);
            return;
        }

        let user_id = user.user_id;
        let action = user.order.action[0];
        let params = user.order.params;
        let time = user.order.time;

        let free = user.order.params[1];
        free =free?JSON.parse(free.toLowerCase()):false;

        /*

                 = [];
                if (action.length === 2 && action[1] === 1)
                else {
                    setTimeout(loop, 1000);
                    return;
                }
        */

        console.log("action",action);

        let script = ["cd "+__dirname+"/workers/deepnude/","&& bash main.sh", params[0], "results/"+user_id+".jpg"];
        if(action===1) {
            let img = __dirname+"/workers/deepnude/results/"+user_id+".jpg";
            script.push("&& cd /www/art/ && python3 ./workers/art/art.py", "-u " + user_id, "-i file://" +img, "-m 6 -q 3");
        }
        // script = ["python3", "./workers/art/art.py", "-u " + user_id, "-i " + params[0], "-m " + action[2]];


        let str = script.join(" ");

        console.log("script",str);
        let out = "";



        let create = exec(str, []);
        create.stdout.on('data', (data) => {
            out = data;
        });
        create.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
        });
        create.on('close', async (code) => {

            if(!free) user.balance-=PRICE;
            user.order = null;
            await user.save();
            if (out !== "empty") {

                console.log(out);

                out=__dirname+"/workers/deepnude/results/"+user_id+".jpg";
                if(action===1)out="/www/art/workers/art/results/"+user_id+".jpg";
                out=out.split("\n")[0];
                console.log("free",free);


                let attachments = await api_vk.photos_upload(user_id, [out]);
                if(attachments) {
                    let attachments_str = [];
                    for (let attachment of attachments) {
                        attachments_str.push("photo" + attachment.owner_id + "_" + attachment.id);
                    }


                    let keyboard = new Keyboard(keyboard_data, "first");
                        for(let col of keyboard.buttons){
                            for( let line of col){
                                if(line.action && line.action.type==="text" && line.action.payload.to==="nude_free")
                                    if(max_free_orders-user.free_orders>0)
                                        line.action.label+=" | БЕСПЛАТНО:"+(max_free_orders-user.free_orders);
                            }

                        }


                    //await api_vk.messages_send(admin_user_ids.join(","), time, "https://vk.com/gim"+group_id+"?sel="+user_id, attachments_str.join(","),null);





                    let msg = "Готово! ОСТАЛОСЬ "+user.balance+" ОБРАБОТОК";
                    if(free) msg+="\nБЕСПЛАТНЫХ АРТ ОБРАБОТОК: "+(max_free_orders-user.free_orders);


                 /*   if(await api_vk.groups_isMember(group_id,user_id)===1){
                        msg+="\n\nПодпишитесь на нас, если не хотите нас потерять! @razdevatel (ПОДПИСАТЬСЯ)"
                    }*/


                    await api_vk.messages_send(user_id, user_id + time, msg , attachments_str.join(","), keyboard,null,1);
                }

                //out
            }
            loop();
        });
    }catch(err){
        console.log(err);
    }
}

loop();






let keyboard_notif = new Keyboard(keyboard_data, "first");

function notification(message) {

    async function parse(offset, type){

        console.log({offset});
        let req = await api_vk.messages_getConversations(186249074,offset,100,type);

        if(!req.data.response)
            return; console.log(req.data);

        let items = req.data.response.items;
        let ids=[];
        for(let item of items)ids.push(item.conversation.peer.id);

        let time= Math.round(new Date().getTime());
        console.log(ids);

        let attachments = message.get_attachments();
        console.log({attachments});
        api_vk.messages_send(ids.join(","),time,message.text.split("#")[1],attachments, keyboard_notif, function(sended){
            console.log("SENDED", offset+" "+JSON.stringify(sended.data));
        });

        console.log(ids);

        if(ids.length>50){
            setTimeout(function(){
                parse(offset+100,type);
            },2000);
        }
    }
    parse(0,'all');
}

//Удаляем старые файлы
setInterval(function () {
    exec('find '+__dirname+'/workers/deepnude/results/* -mmin +5000 |xargs -i rm {}', []);
}, 60 * 60 * 1000);


app.listen(port);

//exports.app = app;
