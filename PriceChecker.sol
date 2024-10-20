// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8;
pragma abicoder v2;

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';

contract PriceChecker {
    ISwapRouter public immutable swapRouter;
    uint public immutable split;
    uint256 public amountIn;
    uint256 public desiredOutput;
    uint256 public totalIn;
    
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F; // DAI token address
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH token address
    uint24 public constant poolFee = 3000; // Example: 0.3% fee pool

    constructor(ISwapRouter _swapRouter, uint256 _split, uint256 _amountIn, uint256 _desiredOutput) {
        totalIn = _amountIn;
        amountIn = _amountIn;
        desiredOutput = _desiredOutput;
        swapRouter = _swapRouter;
        split = _split;

        desiredOutput = desiredOutput / split;
        amountIn = amountIn / split;
    }

    /// @notice This function checks if the amountIn can provide at least desiredOutput tokens.
    /// @param tokenIn The input token address (e.g., DAI).
    /// @param tokenOut The output token address (e.g., WETH9).
    /// @return canSwap True if the amountIn is sufficient to get the desiredOutput, false otherwise.
    function checkPrice(
        address tokenIn, 
        address tokenOut
    ) external returns (bool canSwap) {
        
        // Build the quote params
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: address(this), // This can be any address; we are just checking
                deadline: block.timestamp + 120, // 2 minutes from now
                amountIn: amountIn,
                amountOutMinimum: 0, // We don't care about the exact minimum output yet
                sqrtPriceLimitX96: 0 // No price limits, using pool's current rate
            });

        // Call the `quoteExactInputSingle` method to estimate the output for the given amountIn
        uint256 estimatedOutput = swapRouter.exactInputSingle(params);

        // Compare the estimated output with the desired output
        if (estimatedOutput >= desiredOutput) {
            return true; // AmountIn is sufficient for desiredOutput
        } else {
            return false; // AmountIn is not sufficient
        }
    }


     /// @notice swapExactOutputSingle swaps a minimum possible amount of DAI for a fixed amount of WETH.
    function swapExactOutputSingle() external returns (uint256 amountPayed) {
        require(totalIn > amountIn, "All Order has been executed.");
        totalIn = totalIn - amountIn;

        // Transfer the specified amount of DAI to this contract.
        TransferHelper.safeTransferFrom(DAI, msg.sender, address(this), amountIn);

        // Approve the router to spend the specified `amountInMaximum` of DAI.
        TransferHelper.safeApprove(DAI, address(swapRouter), amountIn);

        ISwapRouter.ExactOutputSingleParams memory params =
            ISwapRouter.ExactOutputSingleParams({
                tokenIn: DAI,
                tokenOut: WETH9,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountOut: desiredOutput,
                amountInMaximum: amountIn,
                sqrtPriceLimitX96: 0
            });

        // Executes the swap returning the amountIn needed to spend to receive the desired amountOut.
        amountPayed = swapRouter.exactOutputSingle(params);

        // For exact output swaps, the amountInMaximum may not have all been spent.
        if (amountPayed < amountIn) {
            TransferHelper.safeApprove(DAI, address(swapRouter), 0);
            TransferHelper.safeTransfer(DAI, msg.sender, amountIn - amountPayed);
        }

        return amountPayed; // Return the actual amount spent
    }
}
