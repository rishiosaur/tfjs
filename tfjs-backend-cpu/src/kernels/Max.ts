/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {Max, MaxAttrs, MaxInputs} from '@tensorflow/tfjs-core';
import {backend_util, KernelConfig} from '@tensorflow/tfjs-core';
import {TypedArray, util} from '@tensorflow/tfjs-core';

import {MathBackendCPU} from '../backend_cpu';
import {assertNotComplex} from '../cpu_util';

import {maxImpl} from './Max_impl';
import {transposeImpl} from './Transpose_impl';

export const maxConfig: KernelConfig = {
  kernelName: Max,
  backendName: 'cpu',
  kernelFunc: ({inputs, attrs, backend}) => {
    const {x} = inputs as MaxInputs;
    const {reductionIndices} = attrs as {} as MaxAttrs;
    const cpuBackend = backend as MathBackendCPU;
    const xRank = x.shape.length;
    console.log('max cpu kernel func', x, reductionIndices);

    const origAxes = util.parseAxisParam(reductionIndices, x.shape);
    let axes = origAxes;
    const permutedAxes = backend_util.getAxesPermutation(axes, xRank);
    let xVals = cpuBackend.data.get(x.dataId).values as TypedArray;
    console.log('permuted axes', permutedAxes);
    if (permutedAxes != null) {
      xVals = transposeImpl(xVals, x.shape, x.dtype, permutedAxes);
      axes = backend_util.getInnerMostAxes(axes.length, xRank);
    }
    console.log('axes', axes);
    console.log('x', xVals);

    assertNotComplex(x, 'max');
    backend_util.assertAxesAreInnerMostDims('max', axes, xRank);
    const [outShape, reduceShape] =
        backend_util.computeOutAndReduceShapes(x.shape, axes);

    const reduceSize = util.sizeFromShape(reduceShape);

    const result = maxImpl(xVals, reduceSize, outShape, x.dtype);
    console.log('RESULT');
    console.log('x shape', x.shape, axes);
    console.log(reduceShape);
    console.log(reduceSize, outShape);
    console.log(result);

    const dataId = cpuBackend.write(result, outShape, x.dtype);
    return {dataId, shape: outShape, dtype: x.dtype};
  }
};