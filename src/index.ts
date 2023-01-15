import { User } from './Models/User';

new User({ email: 'test@test.com', password: '123123' }).create().then((user) => {
  console.log(user);
});

User.findOne([]).then((user) => {});
