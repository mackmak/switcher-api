import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Admin from '../src/models/admin';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import Config from '../src/models/config';
import History from '../src/models/history';
import { ConfigStrategy } from '../src/models/config-strategy';
import { EnvType, Environment } from '../src/models/environment';
import { 
    setupDatabase,
    adminMasterAccountId,
    adminMasterAccountToken,
    adminMasterAccount,
    adminAccountToken,
    adminAccount,
    domainDocument,
    domainId,
    groupConfigId,
    configId1,
    configId2,
    configStrategyId,
    environment1Id
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Testing Domain insertion', () => {
    beforeAll(setupDatabase)

    test('DOMAIN_SUITE - Should create a new Domain', async () => {
        const response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Domain',
                description: 'Description of my new Domain'
            }).expect(201)

        // DB validation - document created
        const domain = await Domain.findById(response.body._id)
        expect(domain).not.toBeNull()

        // Response validation
        expect(response.body.name).toBe('New Domain')
    })

    test('DOMAIN_SUITE - Should NOT create a new Domain - Missing required params', async () => {
        const response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Domain'
            }).expect(400)
    })
})

describe('Testing fect Domain info', () => {
    beforeAll(setupDatabase)

    test('DOMAIN_SUITE - Should get Domain information', async () => {
        let response = await request(app)
            .get('/domain')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.length).toEqual(1)
        expect(response.body[0].activated[EnvType.DEFAULT]).toEqual(true);
        expect(String(response.body[0]._id)).toEqual(String(domainDocument._id))
        expect(response.body[0].name).toEqual(domainDocument.name)
        expect(String(response.body[0].owner)).toEqual(String(domainDocument.owner))
        expect(response.body[0].token).toEqual(domainDocument.token)

        // Adding new Domain
        response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My New Domain',
                description: 'Description of my new Domain'
            }).expect(201)

        // DB validation - document created
        const domain = await Domain.findById(response.body._id)
        expect(domain).not.toBeNull()

        response = await request(app)
            .get('/domain?sortBy=createdAt:desc')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.length).toEqual(2)

        response = await request(app)
            .get('/domain?limit=1')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.length).toEqual(1)
    })

    test('DOMAIN_SUITE - Should get Domain information by Id', async () => {
        let response = await request(app)
            .get('/domain/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(String(response.body._id)).toEqual(String(domainDocument._id))
        expect(response.body.name).toEqual(domainDocument.name)
        expect(String(response.body.owner)).toEqual(String(domainDocument.owner))
        expect(response.body.token).toEqual(domainDocument.token)

        // Adding new Domain
        response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Domain 2',
                description: 'Description of my new Domain 2'
            }).expect(201)

        response = await request(app)
            .get('/domain/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
    })

    test('DOMAIN_SUITE - Should NOT found Domain information by Id', async () => {
        await request(app)
            .get('/domain/' + domainId + 'NOTEXIST')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)

        await request(app)
            .get('/domain/5dd05cfa98adc4285457e29a')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('DOMAIN_SUITE - Should delete Domain', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        // DB validation Before deleting
        let domain = await Domain.findById(domainId)
        expect(domain).not.toBeNull()

        let group = await GroupConfig.findById(groupConfigId)
        expect(group).not.toBeNull()

        let config1 = await Config.findById(configId1)
        expect(config1).not.toBeNull()

        let config2 = await Config.findById(configId2)
        expect(config2).not.toBeNull()

        let configStrategy = await ConfigStrategy.findById(configStrategyId)
        expect(configStrategy).not.toBeNull()

        let environment = await Environment.findById(environment1Id)
        expect(environment).not.toBeNull()
        
        await request(app)
            .delete('/domain/' + domainId)
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send().expect(200)

        const admin = await Admin.findById(adminMasterAccountId)
        expect(admin).not.toBeNull()

        // DB validation After - Verify deleted dependencies
        domain = await Domain.findById(domainId)
        expect(domain).toBeNull()

        group = await GroupConfig.findById(groupConfigId)
        expect(group).toBeNull()

        config1 = await Config.findById(configId1)
        expect(config1).toBeNull()

        config2 = await Config.findById(configId2)
        expect(config2).toBeNull()

        configStrategy = await ConfigStrategy.findById(configStrategyId)
        expect(configStrategy).toBeNull()

        environment = await Environment.findById(environment1Id)
        expect(environment).toBeNull()
    })

    test('DOMAIN_SUITE - Should NOT delete Domain', async () => {
        let responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        await request(app)
            .delete('/domain/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send().expect(404)

        await request(app)
            .delete('/domain/INVALID_DOMAIN_ID')
            .set('Authorization', `Bearer ${responseLogin.body.jwt.token}`)
            .send().expect(500)
    })
})

describe('Testing update Domain info', () => {
    beforeAll(setupDatabase)

    test('DOMAIN_SUITE - Should update Domain info', async () => {
        const oldQuery = await Domain.findById(domainId).select('description')

        let history = await History.find({ elementId: domainId })
        expect(history.length).toEqual(0)

        await request(app)
            .patch('/domain/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description updated'
            }).expect(200)
        
        // DB validation - verify description updated
        const newQuery = await Domain.findById(domainId).select('description')
        expect(oldQuery).not.toEqual(newQuery)
        expect(newQuery.description).toEqual('Description updated')

        // DB validation - verify history record added
        history = await History.find({ elementId: domainId })
        expect(history.length > 0).toEqual(true)
    })

    test('DOMAIN_SUITE - Should NOT update Domain info', async () => {
        await request(app)
            .patch('/domain/UNKNOWN_DOMAIN_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description updated'
            }).expect(500)

        await request(app)
            .patch('/domain/5dd05cfa98adc4285457e29a')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description updated'
            }).expect(404)
    })

    test('DOMAIN_SUITE - Should NOT update Domain name', async () => {
        await request(app)
            .patch('/domain/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Domain name'
            }).expect(400)
    })

    test('DOMAIN_SUITE - Should update Domain environment status - default', async () => {
        expect(domainDocument.activated.get(EnvType.DEFAULT)).toEqual(true);

        const response = await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(200);

        expect(response.body.activated[EnvType.DEFAULT]).toEqual(false);

        // DB validation - verify status updated
        const domain = await Domain.findById(domainId)
        expect(domain.activated.get(EnvType.DEFAULT)).toEqual(false);
    })

    test('DOMAIN_SUITE - Should NOT update environment status given an unknown Domain ID ', async () => {
        await request(app)
            .patch('/domain/updateStatus/UNKNOWN_DOMAIN_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(400);

        await request(app)
            .patch('/domain/updateStatus/5dd05cfa98adc4285457e29a')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(404);
    })

    test('DOMAIN_SUITE - Should NOT update environment status given an unknown environment name', async () => {
        const response = await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                UNKNWON_ENV_NAME: false
            }).expect(400);
        
        expect(response.body.error).toEqual('Invalid updates');
    })

    test('DOMAIN_SUITE - Should NOT read changes on history collection - Invalid Domain Id', async () => {
        await request(app)
            .get('/domain/history/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('DOMAIN_SUITE - Should NOT read changes on history collection - Domain not found', async () => {
        await request(app)
            .get('/domain/history/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('DOMAIN_SUITE - Should NOT delete history by invalid Domain Id', async () => {
        await request(app)
            .delete('/domain/history/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)

        await request(app)
            .delete('/domain/history/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(500)
    })

    test('DOMAIN_SUITE - Should delete history from a Domain element', async () => {
        let history = await History.find({ elementId: domainId })
        expect(history.length > 0).toEqual(true)

        await request(app)
            .delete('/domain/history/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        history = await History.find({ elementId: domainId })
        expect(history.length > 0).toEqual(false)
    })

    test('DOMAIN_SUITE - Should record changes on history collection', async () => {
        let response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Domain Record',
                description: 'Description of my new Domain'
            }).expect(201)
            
        const id = response.body._id
        response = await request(app)
                .get('/domain/history/' + id)
                .set('Authorization', `Bearer ${adminMasterAccountToken}`)
                .send().expect(200)
        
        expect(response.body).toEqual([])

        await request(app)
            .patch('/domain/' + id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description'
            }).expect(200)

        response = await request(app)
            .get('/domain/history/' + id + '?sortBy=createdAt:desc')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body).not.toEqual([])

        // DB validation
        let history = await History.find({ elementId: id })
        expect(history[0].oldValue.get('description')).toEqual('Description of my new Domain')
        expect(history[0].newValue.get('description')).toEqual('New description')

        await request(app)
            .patch('/domain/updateStatus/' + id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(200);
        
        // DB validation
        history = await History.find({ elementId: id })
        expect(history.length).toEqual(2)
    })
})

describe('Testing environment configurations', () => {
    beforeAll(setupDatabase)

    test('DOMAIN_SUITE - Should update Domain environment status - QA', async () => {
        // QA Environment still does not exist
        expect(domainDocument.activated.get('QA')).toEqual(undefined);

        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)

        let history = await History.find({ elementId: domainId })
        expect(history.length).toEqual(0)

        const response = await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: true
            }).expect(200);

        expect(response.body.activated['QA']).toEqual(true);

        // DB validation - verify status updated
        let domain = await Domain.findById(domainId)
        expect(domain.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(domain.activated.get('QA')).toEqual(true);

        // DB validation - verify history record added
        history = await History.find({ elementId: domainId })
        expect(history[0].oldValue.get('activated')[EnvType.DEFAULT]).toEqual(true);
        expect(history[0].newValue.get('activated')['QA']).toEqual(true);

        // Inactivating QA. Default environment should stay activated
        await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: false
            }).expect(200);

        domain = await Domain.findById(domainId)
        expect(domain.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(domain.activated.get('QA')).toEqual(false);
    })

    test('DOMAIN_SUITE - Should remove Domain environment status', async () => {
        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA1',
                domain: domainId
            }).expect(201)
        
        await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA1: true
            }).expect(200);

        let domain = await Domain.findById(domainId)
        expect(domain.activated.get('QA1')).toEqual(true);

        await request(app)
            .patch('/domain/removeStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA1'
            }).expect(200);

        // DB validation - verify status updated
        domain = await Domain.findById(domainId)
        expect(domain.activated.get('QA1')).toEqual(undefined);
    })

    test('DOMAIN_SUITE - Should NOT remove Domain environment status', async () => {
        // Creating QA3 Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA3',
                domain: domainId
            }).expect(201)

        await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA3: true
            }).expect(200);

        // default environment cannot be removed
        await request(app)
            .patch('/domain/removeStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: EnvType.DEFAULT
            }).expect(400);

        // Invalid Domain Id
        await request(app)
            .patch('/domain/removeStatus/FAKE_DOMAIN')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA3'
            }).expect(400);

        // Domain does not exist
        await request(app)
            .patch('/domain/removeStatus/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA3'
            }).expect(404);

        const domain = await Domain.findById(domainId)
        expect(domain.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(domain.activated.get('QA3')).toEqual(true);
    })
})