import { BaseModel } from './BaseModel';
export class User extends BaseModel {
  static _table = 'users';

  static _pk = 'id';

  id: number;

  email: string;

  password: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(props: { id?: number; email: string; password: string }) {
    super(props);
  }
}
