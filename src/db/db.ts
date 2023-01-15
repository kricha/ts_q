import mysql, { Connection as PromiseConnection } from 'mysql2/promise';

import { Criteria } from '../Models/BaseModel';

let conn: PromiseConnection = null;

const createConnection = async () => {
  conn = await mysql.createConnection({
    database: 'db',
    namedPlaceholders: true,
    host: '127.0.0.1',
    user: 'root',
    password: '',
  });

  //TODO: use this in future if need
  conn.on('error', async (_err) => {});

  return conn;
};

const getConnection = async () => {
  // @ts-ignore: Not described in interface
  if (!conn || conn?.connection?._closing) {
    conn = await createConnection();
  }
  return conn;
};

export const closeDbConnection = () => {
  if (conn) {
    conn.destroy();
  }
};

class DataBase {
  selectFromModel<T>(table: string, criteria: Criteria<T>[], singleRow = false) {
    return new Promise((resolve, reject) => {
      const params = {} as { [K in keyof T]: T[K] };
      const compArray = [];
      for (const cri of criteria) {
        params[cri.field] = cri.value;
        compArray.push(`${cri.field} ${cri?.comparison ? cri.comparison : '='} :${cri.field}`);
      }
      const sql = `SELECT * from ${table} WHERE ${compArray.join(' and ')};`;
      this._processSelectQuery(sql, params, singleRow).then((result) => {
        resolve(result);
      });
    });
  }

  insertFromModel(table: string, params: object): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO ${table} (${Object.keys(params).join(', ')}) VALUES (${Object.keys(params)
        .map((k) => `:${k}`)
        .join(', ')});`;
      this._processInsertOrUpdateQuery(sql, params)
        .then((res) => resolve(res.insertId))
        .catch((error) => {
          error.params = params;
          reject(error);
        });
    });
  }

  updateFromModel(table: string, params: object, pkField: string, pkValue: string): Promise<mysql.ResultSetHeader> {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE ${table} SET ${Object.keys(params)
        .map((k) => `${k} = :${k}`)
        .join(', ')} WHERE ${pkField} = :${pkField};`;
      params[pkField] = pkValue;
      this._processInsertOrUpdateQuery(sql, params)
        .then((res) => {
          resolve(res);
        })
        .catch((error) => {
          error.params = params;
          reject(error);
        });
    });
  }

  deleteFromModel(table: string, pkField: string, pkValue: string): Promise<mysql.ResultSetHeader> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM ${table} WHERE ${pkField} = :${pkField};`;
      this._processDeleteQuery({ sql, values: { [pkField]: pkValue } })
        .then((res) => {
          resolve(res);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  private _processInsertOrUpdateQuery(query: string, values: object): Promise<mysql.ResultSetHeader> {
    return new Promise(async (resolve, reject) => {
      (await getConnection())
        .execute(query, values)
        .then(([result]: [mysql.ResultSetHeader, mysql.FieldPacket[]]) => {
          resolve(result);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  private _processSelectQuery(query: string, values: object = null, singleRow = false): Promise<any> {
    return new Promise(async (resolve, reject) => {
      (await getConnection())
        .execute(query, values)
        .then(([rows]: [mysql.RowDataPacket[], mysql.FieldPacket[]]) => {
          if (singleRow) {
            resolve(rows[0] || null);
          } else {
            resolve(rows);
          }
        })
        .catch((error) => {
          console.error('Error on executing _processSelectQuery', {
            query,
            msg: error.message,
            values,
          });
          reject(error);
        });
    });
  }

  private _processDeleteQuery(options: mysql.QueryOptions) {
    return new Promise<mysql.ResultSetHeader>(async (resolve, reject) => {
      (await getConnection())
        .execute(options)
        .then(([result]: [mysql.ResultSetHeader, mysql.FieldPacket[]]) => {
          resolve(result);
        })
        .catch((err) => reject(err));
    });
  }
}

export const db = new DataBase();
