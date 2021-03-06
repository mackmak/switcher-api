import mongoose from 'mongoose';
import moment from 'moment';
import GroupConfig from './group-config';
import History from './history';
import { Team } from './team';
import { EnvType, Environment } from './environment';
import { recordHistory } from './common/index'

const domainSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 5,
    },
    description: {
        type: String,
        trim: true
    },
    activated: {
        type: Map,
        of: Boolean,
        required: true,
        default: new Map().set(EnvType.DEFAULT, true)
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    },
    lastUpdate: {
        type: Number,
        default: Date.now()
    },
    updatedBy: {
        type: String
    }
}, {
    timestamps: true
})

domainSchema.virtual('groupConfig', {
    ref: 'GroupConfig',
    localField: '_id',
    foreignField: 'domain'
})

domainSchema.virtual('config', {
    ref: 'Config',
    localField: '_id',
    foreignField: 'domain'
})

domainSchema.virtual('configStrategy', {
    ref: 'ConfigStrategy',
    localField: '_id',
    foreignField: 'domain'
})

domainSchema.virtual('environment', {
    ref: 'Environment',
    localField: '_id',
    foreignField: 'domain'
})

domainSchema.virtual('history', {
    ref: 'History',
    localField: '_id',
    foreignField: 'elementId'
})

domainSchema.virtual('team', {
    ref: 'Team',
    localField: '_id',
    foreignField: 'domain'
})

domainSchema.options.toJSON = {
    getters: true,
    virtuals: true,
    minimize: false,
    transform: function (doc, ret, options) {
        if (ret.updatedAt || ret.createdAt) {
            ret.updatedAt = moment(ret.updatedAt).format('YYYY-MM-DD HH:mm:ss');
            ret.createdAt = moment(ret.createdAt).format('YYYY-MM-DD HH:mm:ss');
        }
        return ret;
    }
}

domainSchema.pre('remove', async function (next) {
    var ObjectId = (require('mongoose').Types.ObjectId);

    const domain = this;
    const group = await GroupConfig.find({ domain: new ObjectId(domain._id) });
    if (group) {
        group.forEach(async (g) => await g.remove());
    }

    const team = await Team.find({ domain: new ObjectId(domain._id) });
    if (team) {
        team.forEach(async (e) => await e.remove());
    }

    const environment = await Environment.find({ domain: new ObjectId(domain._id) });
    if (environment) {
        environment.forEach(async (e) => await e.remove());
    }

    const history = await History.find({ elementId: new ObjectId(domain._id) });
    if (history) {
        history.forEach((h) => h.remove());
    }

    next();
})

async function recordDomainHistory(domain, modifiedField) {
    if (domain.__v !== undefined && modifiedField.length) {
        const oldDomain = await Domain.findById(domain._id);
        recordHistory(modifiedField, oldDomain, domain, ['lastUpdate']);
    }
}

domainSchema.pre('save', async function (next) {
    const domain = this;
    await recordDomainHistory(domain, this.modifiedPaths());
    next();
})

const Domain = mongoose.model('Domain', domainSchema);

export default Domain;