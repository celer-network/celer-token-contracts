# angle/private sale rounds
# input generator for transfering tokens to timelock contracts
# read file format: each line of "to_address,value"
# write file format: each line of an input in transfer format

import csv

def generate_input(r_path, w_path):
    with open(r_path, 'rb') as f:
        reader = csv.reader(f)
        info = list(reader)
    result = ''
    for i in range(len(info)):
        result = result + '\"{0}\",{1}\n'.format(info[i][0], info[i][1])
    with open(w_path, 'wb') as f:
        f.write(result)


if __name__ == '__main__':
    READ_PATH = './read/transfer_tokens_to_timelocks.csv'
    WRITE_PATH = './write/transfer_tokens_to_timelocks.txt'

    generate_input(READ_PATH, WRITE_PATH)
    