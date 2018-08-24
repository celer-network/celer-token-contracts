# angle/private sale rounds
# input generator for angle/private sale's constructor function
# read file format: "beneficiary_1,beneficiary_2,beneficiary_3...beneficiary_n"
# write file format: each line as the input
# of each beneficiary's timelock contract

import csv


READ_PATH = './read/timelock_beneficiary_addresses.csv'
WRITE_PATH = './write/timelock_constructor_input.txt'
TOKEN_ADDRESS = '0x0'


def generate_input(r_path, w_path, token_address):
    with open(r_path, 'rb') as f:
        reader = csv.reader(f)
        addresses = list(reader)[0]
    result = ''
    for i in range(len(addresses)):
        result += '\"{0}\",\"{1}\"\n'.format(token_address, addresses[i])
    with open(w_path, 'wb') as f:
        f.write(result)


if __name__ == '__main__':
    generate_input(READ_PATH, WRITE_PATH, TOKEN_ADDRESS)
