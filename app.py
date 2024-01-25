import sys
import numpy
from scipy.optimize import linprog
from flask import Flask, request, render_template
from flask_cors import CORS

app = Flask(
    __name__, 
    static_url_path='',
    static_folder='build',
    template_folder='build'
)
cors = CORS(app)

@app.route("/")
def serve():
    return render_template("index.html")

# noinspection PyDeprecation
@app.route('/api/calculate', methods=['POST'])
def find_gcps():
    kmp = request.json
    verbose = False

    try:
        range_arg: str = request.args.get('range', None, int)
        bounds = (None, None) if range_arg is None else (-range_arg, range_arg)
    except ValueError:
        bounds = (None, None)

    ckpt = kmp['checkpoints']
    ckph = kmp['groups']
    numcps = len(ckpt)
    grp = 0
    gcplist = []

    a_ = []
    b_ = []
    c_ = []
    d_ = []
    s1 = []
    s0 = []
    prevs = []
    nexts = []
    cpline = []

    for i in range(numcps):
        a_.append(ckpt[i]["x1"])
        b_.append(ckpt[i]["z1"] * -1)
        c_.append(ckpt[i]["x2"])
        d_.append(ckpt[i]["z2"] * -1)
        s1.append((a_[i] - c_[i]) / (((a_[i] - c_[i]) ** 2 + (d_[i] - b_[i]) ** 2) ** 0.5 or sys.float_info.min))
        s0.append((d_[i] - b_[i]) / (((a_[i] - c_[i]) ** 2 + (d_[i] - b_[i]) ** 2) ** 0.5 or sys.float_info.min))
        cpline.append([s0[i], s1[i], (s0[i] * -c_[i]) + (s1[i] * -d_[i])])

        if ckpt[i]['prev'] == 255:
            prevs += [[ckph[j]['start'] + ckph[j]['length'] - 1 for j in ckph[grp]['prev'] if j != 255]]
        else:
            prevs += [[i - 1]]

        if ckpt[i]['next'] == 255:
            nexts += [[ckph[j]['start'] for j in ckph[grp]['next'] if j != 255]]
            grp += 1
        else:
            nexts += [[i + 1]]

    for i in range(numcps):
        fbdr1 = []
        fbdr2 = []
        rbdr1 = []
        rbdr2 = []
        vfor = []
        vback = []

        for nexti in nexts[i]:
            v1 = -(b_[nexti] - b_[i])
            v2 = (a_[nexti] - a_[i])
            fbdr1 += [[v1, v2, -a_[nexti] * v1 - b_[nexti] * v2]]

            v1 = (d_[nexti] - d_[i])
            v2 = -(c_[nexti] - c_[i])
            fbdr2 += [[v1, v2, -c_[i] * v1 - d_[i] * v2]]

            vf = [s0[nexti], s1[nexti], (s0[nexti] * -a_[nexti]) + (s1[nexti] * -b_[nexti])]
            vfor += [[cpline[i][j] - vf[j] for j in range(3)]]

        for previ in prevs[i]:
            v1 = -(b_[i] - b_[previ])
            v2 = (a_[i] - a_[previ])
            rbdr1 += [[v1, v2, -a_[i] * v1 - b_[i] * v2]]

            v1 = (d_[i] - d_[previ])
            v2 = -(c_[i] - c_[previ])
            rbdr2 += [[v1, v2, -c_[i] * v1 - d_[i] * v2]]

            vr = [s0[previ], s1[previ], (s0[previ] * -a_[previ]) + (s1[previ] * -b_[previ])]
            vback += [[cpline[i][j] - vr[j] for j in range(3)]]

        for j in range(len(nexts[i])):
            for k in range(len(prevs[i])):
                target = numpy.array([0, 0])
                mat1 = numpy.array([
                    [fbdr1[j][0], fbdr1[j][1]],
                    [rbdr1[k][0], rbdr1[k][1]],
                    [fbdr2[j][0], fbdr2[j][1]],
                    [rbdr2[k][0], rbdr2[k][1]],
                    [-cpline[i][0], -cpline[i][1]],
                    [vfor[j][0],  vfor[j][1]],
                    [vback[k][0], vback[k][1]]
                ])
                const1 = numpy.array([
                    -fbdr1[j][2],
                    -rbdr1[k][2],
                    -fbdr2[j][2],
                    -rbdr2[k][2],
                    cpline[i][2],
                    -vfor[j][2],
                    -vback[k][2]
                ])

                mat2 = numpy.array([
                    [fbdr1[j][0], fbdr1[j][1]],
                    [rbdr1[k][0], rbdr1[k][1]],
                    [fbdr2[j][0], fbdr2[j][1]],
                    [rbdr2[k][0], rbdr2[k][1]],
                    [cpline[i][0], cpline[i][1]],
                    [-vfor[j][0], -vfor[j][1]],
                    [-vback[k][0], -vback[k][1]]
                ])
                const2 = numpy.array([
                    -fbdr1[j][2],
                    -rbdr1[k][2],
                    -fbdr2[j][2],
                    -rbdr2[k][2],
                    -cpline[i][2],
                    vfor[j][2],
                    vback[k][2]
                ])

                res1 = linprog(target, A_ub=mat1, b_ub=const1, bounds=bounds, method='highs')
                res2 = linprog(target, A_ub=mat2, b_ub=const2, bounds=bounds, method='highs')

                if res1.success:
                    if verbose:
                        gcplist += [(i, res1.x)]
                    else:
                        gcplist += [i]
                elif res2.success:
                    if verbose:
                        gcplist += [(i, res2.x)]
                    else:
                        gcplist += [i]

    return gcplist
