import { db } from '../db/db';

export interface Criteria<T> {
  field: Extract<keyof T, string>;
  value: T[Extract<keyof T, string>];
  comparison?: string;
}

export class BaseModel {
  static _pk = 'id';

  static _table: string = null;

  constructor(params: object) {
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const fn = `${key}Process`;
        if (typeof this[fn] === 'function') {
          this[fn](params[key]);
        } else {
          this[key] = params[key];
        }
      }
    }
  }

  create<T extends BaseModel>(this: T): Promise<InstanceType<T>> {
    const params = this._getParams(); //TS2339: Property '_getParams' does not exist on type 'T'.
    const thisTyped = this.constructor as T;
    return db
      .insertFromModel(thisTyped._table, params)
      .then((id) => thisTyped.findOne([{ field: thisTyped._pk, value: id }])); //TS2322: Type 'string' is not assignable to type 'Extract<keyof InstanceType<T>, string>'.
  }

  static findOne<T extends typeof BaseModel>(this: T, criteria: Criteria<InstanceType<T>>[]): Promise<InstanceType<T>> {
    return db.selectFromModel(this._table, criteria, true).then((row: object) => {
      return new this(row) as InstanceType<T>;
    });
  }

  static find<T extends typeof BaseModel>(this: T, criteria: Criteria<InstanceType<T>>[]): Promise<InstanceType<T>[]> {
    return db.selectFromModel(this._table, criteria, false).then((rows: object[]) => {
      return rows.map((row) => new this(row) as InstanceType<T>);
    });
  }

  async save() {
    const params = this._getParams();
    const thisTyped = this.constructor as typeof BaseModel;

    const action = [null, undefined].includes(this[thisTyped._pk]) ? 'create' : 'update';
    try {
      if (action === 'create') {
        this[thisTyped._pk] = await db.insertFromModel(thisTyped._table, params);
        return this[thisTyped._pk];
      } else {
        await db.updateFromModel(thisTyped._table, params, thisTyped._pk, this[thisTyped._pk]);
      }
    } catch (error) {
      console.error(`Can't ${action} model ${this.constructor.name}.`, { error });
      throw error;
    }
  }

  _getParams() {
    const params = {};
    for (const key of Object.keys(this)) {
      if (['id', '_table', '_pk'].includes(key)) {
        continue;
      } else {
        params[key] = this[key];
      }
    }
    return params;
  }

  static deleteByPK($pkValue) {
    return db.deleteFromModel(this._table, this._pk, $pkValue);
  }

  async delete() {
    const thisTyped = this.constructor as typeof BaseModel;
    try {
      await db.deleteFromModel(thisTyped._table, thisTyped._pk, this[thisTyped._pk]);
    } catch (error) {
      console.error(`Can't delete model ${this.constructor.name}.`, { error });
    }
  }
}
