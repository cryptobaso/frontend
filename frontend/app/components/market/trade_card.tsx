"use client";

import { SecondaryButton } from "@/app/ui/button";
import { useState } from "react";
import { ethers } from "ethers";
import { CoinType } from "@/app/models/coin";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
];

const TradeCard = ({ coin }: { coin: CoinType }) => {
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState<number>(0);
  const [splits, setSplits] = useState<number>(1);

  const swapTokens = async ({
    amount,
    coin,
  }: {
    amount: number;
    coin: string;
  }) => {
    try {
      // Check if window.ethereum is available
      if (typeof window.ethereum !== "undefined") {
        // Request account access
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        // Get the first account
        const account = accounts[0];

        // Create a Web3Provider instance
        const provider = new ethers.providers.Web3Provider(window.ethereum);

        // Get the signer
        const signer = provider.getSigner();

        console.log("Connected wallet address:", account);

        // You can now use the signer for transactions
        // For example: const tx = await signer.sendTransaction({...});

        // Check if the wallet is connected to the Polygon Amoy Testnet
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });

        console.log("chainId", chainId);
        const amoyTestnetChainId = "0x13882"; // Chain ID for Polygon Amoy Testnet

        if (chainId !== amoyTestnetChainId) {
          try {
            // Request network switch to Polygon Amoy Testnet
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: amoyTestnetChainId }],
            });
          } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              try {
                // Add the Polygon Amoy Testnet to the wallet
                await window.ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: amoyTestnetChainId,
                      chainName: "Polygon Amoy Testnet",
                      nativeCurrency: {
                        name: "MATIC",
                        symbol: "MATIC",
                        decimals: 18,
                      },
                      rpcUrls: ["https://rpc-amoy.polygon.technology/"],
                      blockExplorerUrls: ["https://www.oklink.com/amoy"],
                    },
                  ],
                });
              } catch (addError) {
                console.error("Error adding Polygon Amoy Testnet:", addError);
                return null;
              }
            } else {
              console.error(
                "Error switching to Polygon Amoy Testnet:",
                switchError
              );
              return null;
            }
          }
        }

        console.log("Connected to Polygon Amoy Testnet");

        // Get the contract addresses of the two tokens
        const wethAddress = "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa";
        const usdcAddress = "0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97";

        console.log("WETH contract address:", wethAddress);
        console.log("USDC contract address:", usdcAddress);

        // Create instances of the token contracts
        const wethContract = new ethers.Contract(
          wethAddress,
          ERC20_ABI,
          signer
        );
        const usdcContract = new ethers.Contract(
          usdcAddress,
          ERC20_ABI,
          signer
        );

        // Get the current exchange rate (this is a simplified example)
        const exchangeRate = 1800; // 1 ETH = 1800 USDC

        const amount = 5;

        // Calculate the amount of USDC to receive
        const usdcAmount = ethers.utils.parseUnits(
          (amount * exchangeRate).toString(),
          6
        ); // USDC has 6 decimal places

        // Approve the WETH contract to spend tokens
        const approveTx = await wethContract.approve(
          usdcAddress,
          ethers.utils.parseEther(amount.toString())
        );
        await approveTx.wait();

        // Perform the swap
        const swapTx = await usdcContract.swapExactTokensForTokens(
          ethers.utils.parseEther(amount.toString()),
          usdcAmount,
          [wethAddress, usdcAddress],
          signer.getAddress(),
          Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from now
        );

        await swapTx.wait();

        console.log(
          `Swapped ${amount} ETH for ${ethers.utils.formatUnits(
            usdcAmount,
            6
          )} USDC`
        );
      } else {
        console.error("Please install MetaMask!");
        return null;
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      return null;
    }
  };

  return (
    <div className="rounded-lg w-1/3 p-8 bg-white/[.02] shadow-lg shadow-[rgba(134, 134, 134, 0.25)] border-white/[.1] border">
      <div className="flex w-full items-start justify-between h-full flex-col gap-2">
        <div className="flex flex-col gap-2 w-full">
          <h1 className="text-xl mb-4 font-semibold font-robotoMono">
            Make a Trade
          </h1>
          <p className="text-light text-sm font-inriaSans">
            Choose order type.
          </p>
          <div className="flex items-center w-full">
            <TradeButton
              type="buy"
              isActive={tradeType === "buy"}
              onClick={() => setTradeType("buy")}
            />
            <TradeButton
              type="sell"
              isActive={tradeType === "sell"}
              onClick={() => setTradeType("sell")}
            />
          </div>

          <div className="flex mt-4 flex-col w-full gap-2">
            <p className="text-light text-sm font-inriaSans">
              Amount of {coin.symbol}.
            </p>
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                className="w-full bg-white/[.02] border border-white/[.1] rounded-lg p-2 text-white font-inriaSans focus:outline-none focus:ring-2 focus:ring-[#63B9B8]"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <span className="text-light text-sm font-inriaSans ml-2">
                {coin.symbol}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-light text-sm font-inriaSans">
              Total:{" "}
              <span className="font-semibold">
                ${(amount * coin.price).toFixed(2)}
              </span>
            </p>
          </div>

          <div className="flex mt-4 flex-col w-full gap-2">
            <p className="text-light text-sm font-inriaSans">
              Number of transaction splits.
            </p>
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                defaultValue={1}
                className="w-full bg-white/[.02] border border-white/[.1] rounded-lg p-2 text-white font-inriaSans focus:outline-none focus:ring-2 focus:ring-[#63B9B8]"
                value={splits}
                onChange={(e) => setSplits(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <SecondaryButton
          text="Trade"
          onClick={() => swapTokens({ amount, coin: coin.slug })}
          fullWidth
        />
      </div>
    </div>
  );
};

const TradeButton = ({
  type,
  isActive,
  onClick,
}: {
  type: "buy" | "sell";
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      className={`${type === "sell" ? "-ml-6" : ""}
              w-full capitalize border cursor-pointer px-auto rounded-xl font-inriaSans py-2
              ${isActive ? "z-10 text-black" : "z-0 text-white"}
              transition-colors duration-0 ease-in-out
              ${
                isActive
                  ? "border-[#63B9B8] bg-button-primary"
                  : "border-[#63B9B8]/[.50] hover:bg-[#63B9B8]/[.15]"
              }
            `}
      onClick={onClick}
    >
      {type}
    </button>
  );
};

export default TradeCard;
