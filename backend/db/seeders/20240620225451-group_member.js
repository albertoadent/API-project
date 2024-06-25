"use strict";

const { Group, Group_Member } = require("../models");

let options = {};
if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA; // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */

    const group1 = await Group.findByPk(1);
    const group2 = await Group.findByPk(2);
    const group3 = await Group.findByPk(3);
    const group4 = await Group.findByPk(4);

    await group1.createGroup_Member({ userId: 1, role: "organizer" });
    await group1.createGroup_Member({ userId: 3, role: "co-host" });
    await group1.createGroup_Member({ userId: 2, role: "member" });
    await group1.createGroup_Member({ userId: 4, role: "pending" });

    await group2.createGroup_Member({ userId: 2, role: "organizer" });
    await group2.createGroup_Member({ userId: 3, role: "co-host" });

    await group3.createGroup_Member({ userId: 3, role: "organizer" });
    await group3.createGroup_Member({ userId: 4, role: "member" });

    await group4.createGroup_Member({ userId: 4, role: "organizer" });
    await group4.createGroup_Member({ userId: 3, role: "pending" });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    options.tableName = "Group_Members";
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(
      options,
      {
        id: { [Op.in]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      },
      {}
    );
  },
};
